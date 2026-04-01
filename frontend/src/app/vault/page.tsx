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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="font-mono text-xs text-neutral-500 animate-pulse">Loading vaults...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <header className="mb-16">
          <Link href="/" className="text-xs font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-light mt-8">My Vaults</h1>
          <p className="font-mono text-xs text-neutral-600 mt-2">Manage your vaults</p>
        </header>

        {!walletAddr ? (
          <div className="border border-neutral-800 p-8">
            <p className="font-mono text-sm text-neutral-500">Connect wallet to view vaults</p>
          </div>
        ) : vaults.length === 0 ? (
          <div className="space-y-6">
            <div className="border border-neutral-800 p-8">
              <p className="font-mono text-sm text-neutral-500">No vaults found</p>
            </div>
            <Link href="/create">
              <div className="border border-neutral-800 px-6 py-3 hover:border-neutral-600 transition-colors inline-block">
                <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">Create Vault</span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {error && (
              <div className="border border-neutral-800 p-4">
                <p className="font-mono text-xs text-neutral-400">{error}</p>
              </div>
            )}

            {vaults.map((vault) => (
              <div key={vault.id} className="border border-neutral-800 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">Vault</p>
                    <p className="font-mono text-lg">#{vault.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">Time Until Trigger</p>
                    <p className={`font-mono text-lg ${vault.triggered ? 'text-neutral-300' : 'text-neutral-400'}`}>
                      {formatTimeRemaining(vault.timeUntilTrigger)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <p className="text-xs font-mono text-neutral-600">Beneficiary</p>
                    <p className="font-mono text-xs text-neutral-400">
                      {vault.recoveryAddress.slice(0, 8)}...{vault.recoveryAddress.slice(-6)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-mono text-neutral-600">Inactivity Period</p>
                    <p className="font-mono text-xs text-neutral-400">
                      {parseFloat(vault.inactivityPeriodSeconds) / 86400} days
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-mono text-neutral-600">Status</p>
                    <p className={`font-mono text-xs ${vault.triggered ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      {vault.triggered ? 'TRIGGERED' : 'Active'}
                    </p>
                  </div>
                </div>

                {!vault.triggered && (
                  <div
                    onClick={() => handleHeartbeat(vault.id)}
                    className={`border border-neutral-800 px-6 py-3 transition-colors cursor-pointer ${
                      heartbeating === vault.id ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-600'
                    }`}
                  >
                    <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">
                      {heartbeating === vault.id ? 'Sending...' : 'Heartbeat'}
                    </span>
                  </div>
                )}

                {vault.triggered && (
                  <Link href="/claim">
                    <div className="border border-neutral-800 px-6 py-3 hover:border-neutral-600 transition-colors inline-block">
                      <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">Claim Recovery</span>
                    </div>
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