"use client";

import { useEffect, useState } from "react";
import { connectWallet, disconnectWallet, getWalletAddress, isLoggedIn } from "@/lib/wallet";
import { fcl } from "@/lib/flow";
import Link from "next/link";

export default function Home() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = fcl.currentUser().subscribe((user: any) => {
      setWalletAddr(user.addr || null);
    });

    const addr = getWalletAddress();
    setWalletAddr(addr);

    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWallet();
    } catch (e) {
      console.error("Failed to connect:", e);
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Shard
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            Dead Man's Switch Wallet Recovery
          </p>
          <p className="text-gray-500">
            Your vault wakes up on its own if you stop checking in
          </p>
        </div>

        <div className="max-w-md mx-auto bg-gray-800 rounded-2xl p-8 border border-gray-700">
          {walletAddr ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
                <p className="font-mono text-lg truncate">
                  {walletAddr.slice(0, 10)}...{walletAddr.slice(-6)}
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/create"
                  className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-center transition-colors"
                >
                  Create Vault
                </Link>
                <Link
                  href="/vault"
                  className="block w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-center transition-colors"
                >
                  My Vaults
                </Link>
                <Link
                  href="/claim"
                  className="block w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-center transition-colors"
                >
                  Claim Recovery
                </Link>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <p className="text-gray-400">
                Connect your Flow wallet to create or manage vaults
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">&#x26A1;</div>
            <h3 className="font-semibold mb-2">No Keepers</h3>
            <p className="text-sm text-gray-400">
              Flow scheduled transactions trigger automatically - no external bots
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">&#x1F512;</div>
            <h3 className="font-semibold mb-2">Key Protection</h3>
            <p className="text-sm text-gray-400">
              Recovery keys encrypted with Lit Protocol - only beneficiary can decrypt
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="text-3xl mb-3">&#x1F3E0;</div>
            <h3 className="font-semibold mb-2">Self-Custodial</h3>
            <p className="text-sm text-gray-400">
              You control your assets - no third party can freeze or access
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}