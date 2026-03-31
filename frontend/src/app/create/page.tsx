"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fcl } from "@/lib/flow";
import { connectWallet, getWalletAddress } from "@/lib/wallet";
import Link from "next/link";

const SETUP_VAULT_CODE = `
import "Shard"

transaction(recoveryAddress: Address, inactivityPeriodDays: UInt64) {
  prepare(signer: auth(Storage, Capabilities) &Account) {
    let admin = signer.storage.borrow<&Shard.Admin>(from: /storage/shardAdmin)
      ?? panic("Admin not found")
    
    let inactivitySeconds = UFix64(inactivityPeriodDays) * 86400.0
    
    let vaultId = admin.createVault(
      recoveryAddress: recoveryAddress,
      inactivityPeriodSeconds: inactivitySeconds
    )
    
    log("Created vault: ".concat(vaultId.toString()))
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

    setCreating(true);
    setError(null);

    try {
      const transactionId = await fcl.send([
        fcl.transaction(SETUP_VAULT_CODE),
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
      console.log("Transaction sealed:", tx);

      if (tx.status === 4) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/vault");
        }, 2000);
      } else {
        setError("Transaction failed");
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
                The wallet that will receive your assets if you stop checking in
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
                How many days without a heartbeat before auto-trigger
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-medium mb-2">What happens next:</h3>
              <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                <li>Your vault is created on Flow blockchain</li>
                <li>A recovery wallet is generated for your beneficiary</li>
                <li>The recovery key is encrypted and stored via Lit Protocol</li>
                <li>The encrypted blob is stored on Storacha</li>
                <li>You receive the recovery wallet address to share</li>
              </ol>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-900/50 border border-emerald-700 rounded-lg p-4 text-emerald-300 text-sm">
                Vault created successfully! Redirecting...
              </div>
            )}

            <button
              onClick={handleCreateVault}
              disabled={creating || !recoveryAddress}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
            >
              {creating ? "Creating Vault..." : "Create Vault"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}