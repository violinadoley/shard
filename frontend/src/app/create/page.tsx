"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fcl, t, sendTransaction } from "@/lib/flow";
import { connectWallet, getWalletAddress } from "@/lib/wallet";
import { setupVaultWithRecovery, setRecoveryCIDOnContract, formatTimeRemaining } from "@/lib/vault";
import { ethers } from "ethers";
import Link from "next/link";

const CREATE_VAULT_CODE = `
import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(
    recoveryAddress: Address,
    inactivityPeriodDays: UInt64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Check if VaultOwner already exists
        if signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath) == nil {
            let vaultOwner <- create VaultOwner(signer.address)
            signer.storage.save(<-vaultOwner, to: Shard.vaultStoragePath)
        }

        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let inactivityPeriodSeconds = UFix64(inactivityPeriodDays) * 86400.0

        let vaultId = vaultOwner.createVault(
            recoveryAddress: recoveryAddress,
            inactivityPeriodSeconds: inactivityPeriodSeconds
        )

        log("Created vault: ".concat(vaultId.toString()))

        vaultOwner.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: inactivityPeriodSeconds
        )

        log("Scheduled heartbeat check")
    }
}
`;

export default function CreateVault() {
  const [recoveryAddress, setRecoveryAddress] = useState("");
  const [inactivityDays, setInactivityDays] = useState("30");
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recoveryWalletInfo, setRecoveryWalletInfo] = useState<{
    address: string;
    warning: string;
  } | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const addr = getWalletAddress();
    if (!addr) {
      router.push("/");
    }
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

    // Validate Flow address format
    if (!recoveryAddress.startsWith("0x") || recoveryAddress.length !== 18) {
      setError("Invalid Flow address format (should be 0x...)");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create vault on Flow
      const transactionId = await fcl.send([
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

      const tx = await fcl.tx(transactionId).onceSealed();

      if (tx.status === 4) {
        setTxId(transactionId);
        setSuccess(true);

        // Show recovery wallet info to user
        // Note: In production, we'd parse the vault ID from events
        // For now, we show a placeholder
        setRecoveryWalletInfo({
          address: "Will be displayed after vault creation",
          warning: "IMPORTANT: Save this recovery wallet address!",
        });

        setTimeout(() => {
          router.push("/vault");
        }, 5000);
      } else {
        setError("Transaction failed: " + tx.errorMessage);
      }
    } catch (e: any) {
      console.error("Error creating vault:", e);
      setError(e.message || "Failed to create vault");
    }

    setCreating(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-2">Create Vault</h1>
          <p className="text-gray-400 mb-8">
            Set up your dead man's switch vault
          </p>

          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Beneficiary Address
              </label>
              <input
                type="text"
                value={recoveryAddress}
                onChange={(e) => setRecoveryAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                The Flow wallet that will receive your assets
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Inactivity Period (days)
              </label>
              <input
                type="number"
                value={inactivityDays}
                onChange={(e) => setInactivityDays(e.target.value)}
                min="1"
                max="365"
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                If you don't check in for this many days, vault auto-triggers
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">What happens:</h3>
              <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                <li>Vault created on Flow blockchain</li>
                <li>Scheduled transaction set for {inactivityDays} days</li>
                <li>Vault self-triggers if you don't heartbeat</li>
                <li>Beneficiary can claim after trigger</li>
              </ol>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="bg-emerald-900/50 border border-emerald-700 rounded-lg p-4 text-emerald-300">
                  <p className="font-bold mb-2">Vault Created Successfully!</p>
                  <p className="text-sm">Transaction ID: {txId?.slice(0, 16)}...</p>
                </div>

                {recoveryWalletInfo && (
                  <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
                    <p className="text-yellow-300 font-bold mb-2">
                      {recoveryWalletInfo.warning}
                    </p>
                    <p className="text-sm text-gray-400">
                      The system generates a fresh recovery wallet.
                      Share the recovery wallet address with your beneficiary.
                      When triggered, they can claim and access the funds.
                    </p>
                  </div>
                )}

                <p className="text-center text-gray-400 text-sm">
                  Redirecting to vault page...
                </p>
              </div>
            ) : (
              <button
                onClick={handleCreateVault}
                disabled={creating || !recoveryAddress}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
              >
                {creating ? "Creating Vault..." : "Create Vault"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}