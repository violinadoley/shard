"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fcl } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";
import { decryptRecoveryKey, EncryptedData } from "@/lib/lit";
import { downloadEncryptedKey } from "@/lib/storacha";
import { ethers } from "ethers";

const IS_TRIGGERED_SCRIPT = `
import "Shard"

pub fun main(): Bool {
  let vault = Shard.account.storage.borrow<&Shard.Vault>(
    from: /storage/shardVaults
  ) ?? panic("Vault not found")
  
  return vault.triggered
}
`;

export default function ClaimPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [isTriggered, setIsTriggered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [decryptedKey, setDecryptedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const addr = getWalletAddress();
    setWalletAddr(addr);

    const unsubscribe = fcl.currentUser().subscribe(async (user: any) => {
      setWalletAddr(user.addr || null);

      if (user.addr) {
        await checkTriggered();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkTriggered = async () => {
    setLoading(true);
    try {
      const result = await fcl.query({
        cadence: IS_TRIGGERED_SCRIPT,
      });
      setIsTriggered(result as boolean);
    } catch (e: any) {
      console.error("Error checking triggered status:", e);
      setIsTriggered(false);
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!walletAddr) return;

    setClaiming(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider((window as any).flow);
      const signer = await provider.getSigner();

      const encryptedData: EncryptedData = {
        ciphertext: "placeholder",
        dataToEncryptHash: "placeholder",
        accessControlConditions: [],
      };

      const key = await decryptRecoveryKey(encryptedData, signer);
      setDecryptedKey(key);
    } catch (e: any) {
      console.error("Error claiming:", e);
      setError(e.message || "Failed to claim recovery");
    }

    setClaiming(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-xl">Checking vault status...</div>
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
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            {isTriggered === null ? (
              <p className="text-gray-400">Could not verify vault status</p>
            ) : !isTriggered ? (
              <div className="text-center">
                <div className="text-6xl mb-4">&#x23F3;</div>
                <h2 className="text-2xl font-bold mb-2">Vault Not Yet Triggered</h2>
                <p className="text-gray-400">
                  The vault owner is still active. Recovery can only be claimed after
                  the inactivity period has passed and the vault auto-triggered.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl mb-4">&#x2705;</div>
                  <h2 className="text-2xl font-bold mb-2 text-emerald-400">
                    Vault Triggered - Ready to Claim
                  </h2>
                  <p className="text-gray-400">
                    The vault owner has been inactive. You can now claim the recovery
                    wallet.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {decryptedKey ? (
                  <div className="bg-emerald-900/50 border border-emerald-700 rounded-lg p-4">
                    <p className="text-sm text-emerald-300 mb-2">
                      Recovery Key (keep this safe):
                    </p>
                    <p className="font-mono text-sm break-all bg-gray-700 p-3 rounded-lg">
                      {decryptedKey}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
                  >
                    {claiming ? "Decrypting..." : "Decrypt Recovery Key"}
                  </button>
                )}

                <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-400">
                  <p>
                    <strong>Note:</strong> The recovery key will be decrypted using Lit
                    Protocol access conditions. Make sure you are connecting with the
                    beneficiary wallet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}