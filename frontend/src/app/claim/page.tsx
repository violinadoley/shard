"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fcl, t, executeScript } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";

interface VaultSummary {
  id: number;
  owner: string;
  triggered: boolean;
  recoveryWalletCID: string | null;
  inactivityPeriodDays: number;
}

export default function ClaimPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<VaultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [selectedVault, setSelectedVault] = useState<VaultSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const addr = getWalletAddress();
    setWalletAddr(addr);

    const unsubscribe = fcl.currentUser().subscribe((user: any) => {
      setWalletAddr(user.addr || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!walletAddr) {
      setLoading(false);
      return;
    }

    async function fetchBeneficiaryVaults() {
      setLoading(true);
      setError(null);

      try {
        // Get all vault owners (in production, would need indexing)
        // For demo, we'll query a fixed set or use events
        // Here we implement the beneficiary portal logic

        // The key insight: ANY vault where recoveryAddress == walletAddr
        // To find these, we need to either:
        // 1. Index all vaults on-chain (expensive)
        // 2. Have a beneficiary-to-vault mapping (more efficient)

        // For demo purposes, we'll show the structure
        // In production, you'd use Flow events or a separate registry

        // Check if this wallet is a beneficiary by querying vaults
        // This would iterate through known vaults or use an index

        const allVaults: VaultSummary[] = [];

        // Demo: In production, this would query an on-chain vault registry
        // For now, show empty state if no vaults found via events

        setBeneficiaryVaults(allVaults);
      } catch (e: any) {
        console.error("Error:", e);
        setError(e.message);
      }
      setLoading(false);
    }

    fetchBeneficiaryVaults();
  }, [walletAddr]);

  const handleClaim = async (vault: VaultSummary) => {
    setSelectedVault(vault);
    setClaiming(vault.id);
    setError(null);

    try {
      // In production, this would:
      // 1. Get CID from contract
      // 2. Download from Storacha
      // 3. Decrypt with Lit
      // 4. Display private key

      // For demo, show placeholder
      setDecryptedKey("RECOVERY_KEY_WILL_APPEAR_HERE");
    } catch (e: any) {
      console.error("Error claiming:", e);
      setError(e.message || "Failed to claim");
    }

    setClaiming(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-xl">Checking for vaults where you're the beneficiary...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Beneficiary Portal</h1>
          <p className="text-gray-400 mb-8">
            Connect your wallet to see vaults where you're the designated beneficiary.
          </p>

          {!walletAddr ? (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="text-5xl mb-4">&#x1F392;</div>
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-6">
                Connect your Flow wallet to see if you're a beneficiary of any vaults.
              </p>
              <p className="text-sm text-gray-500">
                Your wallet address is used as your identity. Any vault where your address
                is set as the recovery address will appear here.
              </p>
            </div>
          ) : beneficiaryVaults.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="text-6xl mb-4">&#x2705;</div>
              <h2 className="text-2xl font-bold mb-2">No Vaults Found</h2>
              <p className="text-gray-400 mb-6">
                You're not set as a beneficiary on any vaults, or all vaults are still active.
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
                <p className="mb-2">
                  <strong>How it works:</strong>
                </p>
                <p>
                  When someone creates a vault and sets your Flow wallet address as the
                  recovery address, you become the beneficiary. You'll be able to claim
                  the vault when it triggers.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4">
                  Vaults Where You're Beneficiary ({beneficiaryVaults.length})
                </h2>

                <div className="space-y-4">
                  {beneficiaryVaults.map((vault) => (
                    <div
                      key={vault.id}
                      className="bg-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">Vault #{vault.id}</p>
                          <p className="text-sm text-gray-400">
                            Owner: {vault.owner.slice(0, 10)}...{vault.owner.slice(-6)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            vault.triggered
                              ? "bg-red-900 text-red-300"
                              : "bg-emerald-900 text-emerald-300"
                          }`}
                        >
                          {vault.triggered ? "TRIGGERED" : "Active"}
                        </span>
                      </div>

                      {vault.triggered ? (
                        <button
                          onClick={() => handleClaim(vault)}
                          disabled={claiming === vault.id}
                          className="w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                          {claiming === vault.id ? "Decrypting..." : "Claim Recovery Key"}
                        </button>
                      ) : (
                        <p className="text-sm text-gray-400 mt-3">
                          Vault is still active. Will trigger in {vault.inactivityPeriodDays} days of inactivity.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
                <p>
                  <strong>What happens when you claim:</strong> The recovery key will be
                  decrypted using Lit Protocol (which verifies the vault is triggered) and
                  you'll receive the private key to the recovery wallet. Import this into
                  your wallet to access the funds.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {decryptedKey && selectedVault && (
            <div className="mt-6 bg-emerald-900/50 border border-emerald-700 rounded-lg p-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-2">
                Recovery Key Decrypted!
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Vault #{selectedVault.id} - Owner: {selectedVault.owner.slice(0, 10)}...
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm break-all mb-4">
                {decryptedKey}
              </div>
              <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 text-yellow-300 text-sm">
                <p className="font-bold mb-1">IMPORTANT:</p>
                <p>
                  Never share this key. Anyone with access to this key can control
                  the recovery wallet and all its assets. Import it into a secure wallet
                  immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}