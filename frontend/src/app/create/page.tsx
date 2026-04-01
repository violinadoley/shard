"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fcl, t } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";
import { createPKP } from "@/lib/lit";
import { uploadLitAction } from "@/lib/storacha";
import Link from "next/link";

const LIT_ACTION_CODE = `
const go = async () => {
  const FLOW_TESTNET_REST = "https://rest-testnet.onflow.org";
  const IS_TRIGGERED_SCRIPT = \`
import Shard from 0x\${jsParams.flowContractAddress}
access(all) fun main(owner: Address, vaultId: UInt64): Bool {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
    if vaultOwner == nil { return false }
    return vaultOwner!.getVaultTriggered(vaultId) ?? false
}
  \`.trim();
  const ownerArg = { type: "Address", value: "0x" + jsParams.ownerAddress.replace("0x", "") };
  const vaultIdArg = { type: "UInt64", value: jsParams.vaultId.toString() };
  let triggered = false;
  try {
    const response = await fetch(\`\${FLOW_TESTNET_REST}/v1/scripts?block_height=sealed\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script: btoa(IS_TRIGGERED_SCRIPT), arguments: [btoa(JSON.stringify(ownerArg)), btoa(JSON.stringify(vaultIdArg))] })
    });
    if (!response.ok) { Lit.Actions.setResponse({ response: JSON.stringify({ error: "Flow API error" }) }); return; }
    const result = await response.json();
    const decoded = atob(result.value);
    const parsed = JSON.parse(decoded);
    triggered = parsed.value === true || parsed.value === "true";
  } catch (e) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to query Flow: " + e.message }) }); return;
  }
  if (!triggered) { Lit.Actions.setResponse({ response: JSON.stringify({ status: "NOT_TRIGGERED", vaultId: jsParams.vaultId }) }); return; }
  const message = "shard-vault-claim-" + jsParams.vaultId + "-" + jsParams.ownerAddress;
  const msgHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  const msgHashHex = Array.from(new Uint8Array(msgHash)).map(b => b.toString(16).padStart(2, "0")).join("");
  await Lit.Actions.signEcdsa({ toSign: msgHashHex, publicKey: pkpPublicKey, sigName: "shard_claim_sig" });
  Lit.Actions.setResponse({ response: JSON.stringify({ status: "TRIGGERED", vaultId: jsParams.vaultId, message: "PKP signed — vault access granted" }) });
};
go();
`;

const CREATE_VAULT_CODE = `
import Shard from 0xShard
import FlowTransactionSchedulerUtils from 0x8c5303eaa26202d6

transaction(recoveryAddress: Address, inactivityPeriodDays: UInt64) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        if signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath) == nil {
            let vaultOwner <- create Shard.VaultOwner(_owner: signer.address)
            signer.storage.save(<-vaultOwner, to: Shard.vaultStoragePath)
            let cap = signer.capabilities.storage.issue<&{Shard.VaultOwnerPublic}>(Shard.vaultStoragePath)
            signer.capabilities.publish(cap, at: Shard.vaultOwnerPublicPath)
        }
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath)
            ?? panic("VaultOwner not found")
        let inactivityPeriodSeconds = UFix64(inactivityPeriodDays) * 86400.0
        let vaultId = vaultOwner.createVault(recoveryAddress: recoveryAddress, inactivityPeriodSeconds: inactivityPeriodSeconds)
        log("Created vault: ".concat(vaultId.toString()))
        vaultOwner.scheduleHeartbeatCheck(vaultId: vaultId, delaySeconds: inactivityPeriodSeconds)
    }
}
`;

const SET_RECOVERY_CID_CODE = `
import Shard from 0xShard

transaction(vaultId: UInt64, recoveryWalletCID: String) {
    prepare(signer: auth(Storage) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath)
            ?? panic("VaultOwner not found")
        let vault = vaultOwner.getVault(vaultId) ?? panic("Vault not found")
        vault.setRecoveryWalletCID(recoveryWalletCID)
    }
}
`;

const SET_RECOVERY_ADDRESS_CODE = `
import Shard from 0xShard

transaction(vaultId: UInt64, pkpWalletAddress: String) {
    prepare(signer: auth(Storage) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath)
            ?? panic("VaultOwner not found")
        let vault = vaultOwner.getVault(vaultId) ?? panic("Vault not found")
        vault.setRecoveryWalletAddress(pkpWalletAddress)
    }
}
`;

export default function CreateVault() {
  const [recoveryAddress, setRecoveryAddress] = useState("");
  const [inactivityDays, setInactivityDays] = useState("30");
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pkpAddress, setPkpAddress] = useState<string | null>(null);
  const [litActionCid, setLitActionCid] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const router = useRouter();

  const LIT_API_KEY = process.env.NEXT_PUBLIC_LIT_API_KEY || "";

  useEffect(() => {
    const addr = getWalletAddress();
    if (!addr) router.push("/");
    setWalletAddr(addr);

    const unsubscribe = fcl.currentUser().subscribe((user: any) => {
      setWalletAddr(user.addr || null);
    });
    return () => unsubscribe();
  }, [router]);

  const handleCreateVault = async () => {
    if (!recoveryAddress || !inactivityDays) {
      setError("Please fill in all fields");
      return;
    }
    if (!recoveryAddress.startsWith("0x") || recoveryAddress.length !== 18) {
      setError("Invalid Flow address format (0x + 16 hex chars)");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      setStep("Creating recovery wallet...");
      const pkp = await createPKP(LIT_API_KEY);
      setPkpAddress(pkp.walletAddress);

      setStep("Uploading access logic...");
      const litActionCID = await uploadLitAction(LIT_ACTION_CODE);
      setLitActionCid(litActionCID);

      setStep("Creating vault on Flow...");
      const createTxId = await fcl.send([
        fcl.transaction(CREATE_VAULT_CODE),
        fcl.args([
          fcl.arg(recoveryAddress, t.Address),
          fcl.arg(inactivityDays, t.UInt64),
        ]),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
        fcl.limit(9999),
      ]);
      const createTx = await fcl.tx(createTxId).onceSealed();

      if (createTx.status !== 4) {
        throw new Error("Vault creation failed: " + (createTx.errorMessage || "unknown error"));
      }

      let createdVaultId = "1";
      const vaultCreatedEvent = createTx.events?.find(
        (e: any) => e.type.includes("VaultCreated")
      );
      if (vaultCreatedEvent?.data?.vaultId) {
        createdVaultId = vaultCreatedEvent.data.vaultId.toString();
      }
      setVaultId(createdVaultId);

      setStep("Storing IPFS CID...");
      const cidTxId = await fcl.send([
        fcl.transaction(SET_RECOVERY_CID_CODE),
        fcl.args([
          fcl.arg(createdVaultId, t.UInt64),
          fcl.arg(litActionCID, t.String),
        ]),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
        fcl.limit(9999),
      ]);
      await fcl.tx(cidTxId).onceSealed();

      setStep("Storing PKP address...");
      const addrTxId = await fcl.send([
        fcl.transaction(SET_RECOVERY_ADDRESS_CODE),
        fcl.args([
          fcl.arg(createdVaultId, t.UInt64),
          fcl.arg(pkp.walletAddress, t.String),
        ]),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
        fcl.limit(9999),
      ]);
      await fcl.tx(addrTxId).onceSealed();

      setStep("");
      setSuccess(true);
      setTimeout(() => router.push("/vault"), 8000);

    } catch (e: any) {
      console.error("Error creating vault:", e);
      setError(e.message || "Failed to create vault");
      setStep("");
    }

    setCreating(false);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <header className="mb-16">
          <Link href="/" className="text-xs font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-light mt-8">Create Vault</h1>
          <p className="font-mono text-xs text-neutral-600 mt-2">Set up your dead man's switch</p>
        </header>

        <div className="space-y-12">
          <div className="space-y-2">
            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Beneficiary Address
            </label>
            <input
              type="text"
              value={recoveryAddress}
              onChange={(e) => setRecoveryAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-0 py-3 border-b border-neutral-800 focus:border-neutral-400 bg-transparent text-white text-lg font-mono"
            />
            <p className="text-xs font-mono text-neutral-600">Flow wallet that can claim after trigger</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Inactivity Period (days)
            </label>
            <input
              type="number"
              value={inactivityDays}
              onChange={(e) => setInactivityDays(e.target.value)}
              min="1"
              max="365"
              className="w-full px-0 py-3 border-b border-neutral-800 focus:border-neutral-400 bg-transparent text-white text-lg font-mono"
            />
            <p className="text-xs font-mono text-neutral-600">Vault auto-triggers if heartbeat stops</p>
          </div>

          {error && (
            <div className="border border-neutral-800 p-4">
              <p className="font-mono text-xs text-neutral-400">{error}</p>
            </div>
          )}

          {creating && step && (
            <div className="border border-neutral-800 p-4">
              <p className="font-mono text-xs text-neutral-500 animate-pulse">{step}</p>
            </div>
          )}

          {success ? (
            <div className="space-y-8">
              <div className="border border-neutral-800 p-6">
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Vault Created</p>
                <p className="font-mono text-lg">#{vaultId}</p>
              </div>

              {pkpAddress && (
                <div className="border border-neutral-800 p-4">
                  <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Recovery Wallet (PKP)</p>
                  <p className="font-mono text-xs text-neutral-400 break-all">{pkpAddress}</p>
                </div>
              )}

              {litActionCid && (
                <div className="border border-neutral-800 p-4">
                  <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Lit Action CID</p>
                  <p className="font-mono text-xs text-neutral-400 break-all">{litActionCid}</p>
                </div>
              )}

              <p className="font-mono text-xs text-neutral-600">Redirecting to vault page...</p>
            </div>
          ) : (
            <div className="pt-4">
              <div
                onClick={() => !creating && recoveryAddress && LIT_API_KEY && handleCreateVault()}
                className={`border border-neutral-800 px-8 py-4 transition-colors inline-block cursor-pointer ${
                  creating || !recoveryAddress || !LIT_API_KEY ? 'opacity-40 cursor-not-allowed' : 'hover:border-neutral-600'
                }`}
              >
                <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">
                  {creating ? 'Creating...' : 'Create Vault'}
                </span>
              </div>

              {!LIT_API_KEY && (
                <p className="font-mono text-xs text-neutral-600 mt-4">
                  NEXT_PUBLIC_LIT_API_KEY not set in .env.local
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}