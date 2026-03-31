"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fcl } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";

const GET_VAULT_SCRIPT = `
import "Shard"

pub fun main(): AnyStruct {
  let vault = Shard.account.storage.borrow<&Shard.Vault>(
    from: /storage/shardVaults
  )
  
  if vault == nil {
    return nil
  }
  
  return {
    "id": vault!.id,
    "owner": vault!.owner,
    "recoveryAddress": vault!.recoveryAddress,
    "inactivityPeriodSeconds": vault!.inactivityPeriodSeconds,
    "lastHeartbeat": vault!.lastHeartbeat,
    "triggered": vault!.triggered,
    "recoveryWalletCID": vault!.recoveryWalletCID,
    "timeUntilTrigger": vault!.getTimeUntilTrigger()
  }
}
`;

const HEARTBEAT_CODE = `
import "Shard"

transaction() {
  prepare(signer: auth(Storage, Capabilities) &Account) {
    let vault = Shard.account.storage.borrow<&Shard.Vault>(
      from: /storage/shardVaults
    ) ?? panic("Vault not found")
    
    vault.heartbeat()
    log("Heartbeat recorded")
  }
}
`;

interface VaultData {
  id: number;
  owner: string;
  recoveryAddress: string;
  inactivityPeriodSeconds: string;
  lastHeartbeat: string;
  triggered: boolean;
  recoveryWalletCID: string | null;
  timeUntilTrigger: string;
}

export default function VaultPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heartbeating, setHeartbeating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const addr = getWalletAddress();
    setWalletAddr(addr);

    const unsubscribe = fcl.currentUser().subscribe(async (user: any) => {
      setWalletAddr(user.addr || null);

      if (user.addr) {
        await fetchVault(user.addr);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchVault = async (addr: string) => {
    setLoading(true);
    try {
      const result = await fcl.query({
        cadence: GET_VAULT_SCRIPT,
      });
      setVault(result as VaultData);
    } catch (e: any) {
      console.error("Error fetching vault:", e);
      setVault(null);
    }
    setLoading(false);
  };

  const handleHeartbeat = async () => {
    setHeartbeating(true);
    setError(null);

    try {
      const transactionId = await fcl.send([
        fcl.transaction(HEARTBEAT_CODE),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.payer(fcl.currentUser().authorization),
        fcl.authorizations([fcl.currentUser().authorization]),
        fcl.limit(9999),
      ]);

      const tx = await fcl.tx(transactionId).onceSealed();

      if (tx.status === 4) {
        if (walletAddr) {
          await fetchVault(walletAddr);
        }
      } else {
        setError("Heartbeat failed");
      }
    } catch (e: any) {
      console.error("Error sending heartbeat:", e);
      setError(e.message || "Failed to send heartbeat");
    }

    setHeartbeating(false);
  };

  const formatTimeRemaining = (seconds: string): string => {
    const secs = parseFloat(seconds);
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    return `${days}d ${hours}h remaining`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-xl">Loading vault...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">My Vault</h1>

        {!walletAddr ? (
          <div className="max-w-md mx-auto text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <p className="text-gray-400 mb-6">Connect your wallet to view your vault</p>
          </div>
        ) : !vault ? (
          <div className="max-w-md mx-auto text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <p className="text-gray-400 mb-6">No vault found for this wallet</p>
            <Link
              href="/create"
              className="inline-block py-3 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold"
            >
              Create Vault
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Vault ID</p>
                  <p className="text-2xl font-bold">#{vault.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <p className={`text-2xl font-bold ${vault.triggered ? "text-red-400" : "text-emerald-400"}`}>
                    {vault.triggered ? "TRIGGERED" : "Active"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Beneficiary</p>
                  <p className="font-mono text-sm truncate">
                    {vault.recoveryAddress.slice(0, 10)}...{vault.recoveryAddress.slice(-6)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Inactivity Period</p>
                  <p className="font-semibold">
                    {parseFloat(vault.inactivityPeriodSeconds) / 86400} days
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Time Until Auto-Trigger</h2>
              <div className="text-4xl font-bold text-cyan-400 mb-6">
                {formatTimeRemaining(vault.timeUntilTrigger)}
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleHeartbeat}
                disabled={heartbeating || vault.triggered}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {heartbeating ? "Sending Heartbeat..." : "Send Heartbeat (I'm Alive)"}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Send a heartbeat to reset the timer and keep your vault safe
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Recovery Information</h2>
              {vault.recoveryWalletCID ? (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Recovery Wallet CID</p>
                  <p className="font-mono text-sm break-all bg-gray-700 p-3 rounded-lg">
                    {vault.recoveryWalletCID}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400">
                  Recovery wallet not yet set up. Complete the vault setup flow.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}