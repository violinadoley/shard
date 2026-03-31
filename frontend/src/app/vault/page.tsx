"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fcl, t, sendTransaction, executeScript } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";

const HEARTBEAT_CODE = `
import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(vaultId: UInt64) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let vault = vaultOwner.getVault(vaultId)
            ?? panic("Vault not found")

        vaultOwner.cancelScheduledTx(vaultId)

        vault.heartbeat()
        log("Heartbeat recorded")

        vaultOwner.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: vault.inactivityPeriodSeconds
        )
        log("Scheduled new heartbeat check")
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

function formatTimeRemaining(seconds: string): string {
  const secs = parseFloat(seconds);
  if (secs <= 0) return "TRIGGERED";
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function VaultPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [heartbeating, setHeartbeating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    if (!walletAddr) return;

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

      let vaultIds: number[] = [];
      try {
        const ids = await executeScript(getVaultIdsCode, [
          fcl.arg(walletAddr, t.Address),
        ]);
        vaultIds = (ids as any[]).map((n) => Number(n));
      } catch {
        setVaults([]);
        setLoading(false);
        return;
      }

      // Get vault data for each ID
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
            "inactivityPeriodSeconds": vault.inactivityPeriodSeconds,
            "lastHeartbeat": vault.lastHeartbeat,
            "triggered": vault.triggered,
            "recoveryWalletCID": vault.recoveryWalletCID,
            "timeUntilTrigger": vault.getTimeUntilTrigger()
          }
        }
      `;

      const vaultPromises = vaultIds.map(async (id) => {
        const result = await executeScript(getVaultCode, [
          fcl.arg(walletAddr, t.Address),
          fcl.arg(id.toString(), t.UInt64),
        ]);
        return result as VaultData;
      });

      const vaultData = await Promise.all(vaultPromises);
      setVaults(vaultData);
    } catch (e: any) {
      console.error("Error fetching vaults:", e);
      setError(e.message);
    }
    setLoading(false);
  }, [walletAddr]);

  useEffect(() => {
    const addr = getWalletAddress();
    setWalletAddr(addr);

    const unsubscribe = fcl.currentUser().subscribe((user: any) => {
      setWalletAddr(user.addr || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (walletAddr) {
      fetchVaults();
      // Refresh every 30 seconds
      const interval = setInterval(fetchVaults, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddr, fetchVaults]);

  const handleHeartbeat = async (vaultId: number) => {
    setHeartbeating(vaultId);
    setError(null);

    try {
      const tx = await sendTransaction(HEARTBEAT_CODE, [
        fcl.arg(vaultId.toString(), t.UInt64),
      ]);

      if (tx.status === 4) {
        await fetchVaults();
      } else {
        setError("Heartbeat failed");
      }
    } catch (e: any) {
      console.error("Error sending heartbeat:", e);
      setError(e.message || "Failed to send heartbeat");
    }

    setHeartbeating(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-xl">Loading vaults...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <Link href="/" className="text-gray-400 hover:text-white mb-8 inline-block">
          &larr; Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8">My Vaults</h1>

        {!walletAddr ? (
          <div className="max-w-md mx-auto text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <p className="text-gray-400 mb-6">Connect your wallet to view vaults</p>
          </div>
        ) : vaults.length === 0 ? (
          <div className="max-w-md mx-auto text-center bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <p className="text-gray-400 mb-6">No vaults found</p>
            <Link
              href="/create"
              className="inline-block py-3 px-6 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold"
            >
              Create Vault
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {vaults.map((vault) => (
              <div
                key={vault.id}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Vault #{vault.id}</h2>
                    <p
                      className={`text-lg font-semibold ${
                        vault.triggered ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {vault.triggered ? "TRIGGERED" : "Active"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Time Until Trigger</p>
                    <p
                      className={`text-2xl font-bold ${
                        vault.triggered ? "text-red-400" : "text-cyan-400"
                      }`}
                    >
                      {formatTimeRemaining(vault.timeUntilTrigger)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-400">Beneficiary</p>
                    <p className="font-mono text-sm truncate">
                      {vault.recoveryAddress.slice(0, 10)}...
                      {vault.recoveryAddress.slice(-6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Inactivity Period</p>
                    <p className="font-semibold">
                      {parseFloat(vault.inactivityPeriodSeconds) / 86400} days
                    </p>
                  </div>
                </div>

                {!vault.triggered && (
                  <button
                    onClick={() => handleHeartbeat(vault.id)}
                    disabled={heartbeating === vault.id}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-lg font-bold transition-all disabled:opacity-50"
                  >
                    {heartbeating === vault.id
                      ? "Sending Heartbeat..."
                      : "Send Heartbeat (I'm Alive)"}
                  </button>
                )}

                {vault.triggered && (
                  <Link
                    href="/claim"
                    className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-bold text-center transition-all"
                  >
                    Claim Recovery
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}