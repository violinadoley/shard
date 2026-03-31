"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fcl, t, executeScript } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";

export default function ClaimPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
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

    async function fetchClaimableVaults() {
      try {
        // Get vault IDs
        const getVaultIdsCode = `
          import "Shard"
          pub fun main(owner: Address): [UInt64] {
            let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
              from: Shard.vaultStoragePath
            ) ?? panic("VaultOwner not found")
            return vaultOwner.vaultIds
          }
        `;

        const ids = await executeScript(getVaultIdsCode, [
          fcl.arg(walletAddr, t.Address),
        ]);
        const vaultIds = (ids as any[]).map((n) => Number(n));

        // Get vault data for each
        const getVaultCode = `
          import "Shard"
          pub fun main(owner: Address, vaultId: UInt64): AnyStruct {
            let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
              from: Shard.vaultStoragePath
            ) ?? panic("VaultOwner not found")
            let vault = vaultOwner.getVault(vaultId)
              ?? panic("Vault not found")
            return {
              "id": vault.id,
              "owner": vault.owner,
              "recoveryAddress": vault.recoveryAddress,
              "triggered": vault.triggered,
              "recoveryWalletCID": vault.recoveryWalletCID
            }
          }
        `;

        const vaultPromises = vaultIds.map(async (id) => {
          const result = await executeScript(getVaultCode, [
            fcl.arg(walletAddr, t.Address),
            fcl.arg(id.toString(), t.UInt64),
          ]);
          return { ...(result as any), id };
        });

        const allVaults = await Promise.all(vaultPromises);

        // Filter: only show vaults where this wallet is the beneficiary and is triggered
        const claimableVaults = allVaults.filter(
          (v) =>
            v.recoveryAddress.toLowerCase() === walletAddr.toLowerCase() &&
            v.triggered
        );

        setVaults(claimableVaults);
      } catch (e: any) {
        console.error("Error:", e);
        setError(e.message);
      }
      setLoading(false);
    }

    fetchClaimableVaults();
  }, [walletAddr]);

  const handleClaim = async (vaultId: number) => {
    setClaiming(vaultId);
    setError(null);

    try {
      // In production, this would:
      // 1. Download encrypted blob from Storacha
      // 2. Use Lit to decrypt with access conditions
      // 3. Display the recovery private key

      // For demo, show placeholder
      setDecryptedKey("PRIVATE_KEY_WILL_APPEAR_HERE_AFTER_LIT_DECRYPTION");
    } catch (e: any) {
      console.error("Error claiming:", e);
      setError(e.message || "Failed to claim");
    }

    setClaiming(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-xl">Checking for claimable vaults...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">Claim Recovery</h1>

        <div className="max-w-lg mx-auto">
          {!walletAddr ? (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
              <p className="text-gray-400 mb-6">
                Connect your wallet to check for claimable vaults
              </p>
            </div>
          ) : vaults.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 text-center">
              <div className="text-6xl mb-4">&#x23F3;</div>
              <h2 className="text-2xl font-bold mb-2">No Vaults Available</h2>
              <p className="text-gray-400 mb-6">
                Either no vaults have triggered for you, or you haven't been set
                as a beneficiary yet.
              </p>
              <Link
                href="/"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Go to Home
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
                  {error}
                </div>
              )}

              {decryptedKey ? (
                <div className="bg-emerald-900/50 border border-emerald-700 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-emerald-400 mb-4">
                    Recovery Key Decrypted!
                  </h2>
                  <p className="text-sm text-gray-400 mb-3">
                    Save this private key safely. It allows access to the recovery
                    wallet:
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm break-all mb-4">
                    {decryptedKey}
                  </div>
                  <p className="text-sm text-yellow-400">
                    Important: Never share this key. Anyone with it can access
                    the recovery wallet.
                  </p>
                </div>
              ) : (
                vaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
                  >
                    <div className="text-center mb-6">
                      <div className="text-5xl mb-2">&#x2705;</div>
                      <h2 className="text-2xl font-bold text-emerald-400">
                        Vault #{vault.id} - Ready to Claim
                      </h2>
                      <p className="text-gray-400 mt-2">
                        The vault owner has been inactive. You can now claim
                        the recovery wallet.
                      </p>
                    </div>

                    <button
                      onClick={() => handleClaim(vault.id)}
                      disabled={claiming === vault.id}
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
                    >
                      {claiming === vault.id
                        ? "Decrypting..."
                        : "Decrypt Recovery Key"}
                    </button>
                  </div>
                ))
              )}

              <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
                <p>
                  <strong>How it works:</strong> The recovery key was encrypted
                  using Lit Protocol when the vault was created. When you click
                  decrypt, Lit verifies the vault is triggered and decrypts the
                  key so you can access the recovery wallet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}