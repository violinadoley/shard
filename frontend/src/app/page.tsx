"use client";

import { useEffect, useState } from "react";
import { connectWallet, disconnectWallet, getWalletAddress } from "@/lib/wallet";
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
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <header className="mb-32">
          <h1 className="text-sm font-mono text-neutral-500 mb-2 tracking-widest uppercase">Shard</h1>
          <p className="text-5xl font-light tracking-tight">Autonomous Vault Recovery</p>
          <p className="text-neutral-600 mt-4 font-mono text-sm">Self-executing dead man's switch on Flow</p>
        </header>

        <section className="mb-24">
          {walletAddr ? (
            <div className="space-y-16">
              <div>
                <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Connected</p>
                <p className="font-mono text-lg text-neutral-300">
                  {walletAddr.slice(0, 8)}...{walletAddr.slice(-6)}
                </p>
              </div>

              <nav className="space-y-8">
                <Link href="/create" className="block group">
                  <div className="border-b border-neutral-800 pb-4 group-hover:border-neutral-600 transition-colors">
                    <span className="text-xs font-mono text-neutral-600 mr-4">01</span>
                    <span className="text-xl font-light group-hover:text-neutral-300 transition-colors">Create Vault</span>
                  </div>
                </Link>
                <Link href="/vault" className="block group">
                  <div className="border-b border-neutral-800 pb-4 group-hover:border-neutral-600 transition-colors">
                    <span className="text-xs font-mono text-neutral-600 mr-4">02</span>
                    <span className="text-xl font-light group-hover:text-neutral-300 transition-colors">My Vaults</span>
                  </div>
                </Link>
                <Link href="/claim" className="block group">
                  <div className="border-b border-neutral-800 pb-4 group-hover:border-neutral-600 transition-colors">
                    <span className="text-xs font-mono text-neutral-600 mr-4">03</span>
                    <span className="text-xl font-light group-hover:text-neutral-300 transition-colors">Claim Recovery</span>
                  </div>
                </Link>
              </nav>

              <button
                onClick={handleDisconnect}
                className="font-mono text-xs text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="font-mono text-sm text-neutral-500">
                Connect wallet to interact with vaults
              </p>
              <div
                onClick={handleConnect}
                className={`cursor-pointer ${connecting ? 'opacity-50' : ''}`}
              >
                <div className="border border-neutral-800 px-8 py-4 hover:border-neutral-600 transition-colors inline-block">
                  <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer className="grid grid-cols-3 gap-8 border-t border-neutral-800 pt-12">
          <div>
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-3">Mechanism</p>
            <p className="text-sm text-neutral-500 font-light leading-relaxed">
              Scheduled transactions trigger automatically when heartbeat stops
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-3">Security</p>
            <p className="text-sm text-neutral-500 font-light leading-relaxed">
              Lit Protocol encrypts recovery keys, Flow executes the logic
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-3">Custody</p>
            <p className="text-sm text-neutral-500 font-light leading-relaxed">
              Self-custodial. No third party can freeze or access
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}