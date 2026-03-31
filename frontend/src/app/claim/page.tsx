"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fcl, t } from "@/lib/flow";
import { getWalletAddress } from "@/lib/wallet";
import { executeLitAction } from "@/lib/lit";

const SHARD_CONTRACT_ADDRESS = "ec3c1566d2b4bb6c";
const FLOW_TESTNET_REST = "https://rest-testnet.onflow.org";

interface VaultSummary {
  id: string;
  owner: string;
  triggered: boolean;
  recoveryWalletCID: string | null;
  recoveryWalletAddress: string | null;
  inactivityPeriodDays: number;
}

const GET_VAULT_DATA_SCRIPT = `
import Shard from 0xShard

access(all) fun main(owner: Address, vaultId: UInt64): Shard.VaultData {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
        ?? panic("VaultOwner not found")
    return vaultOwner.getVaultData(vaultId) ?? panic("Vault not found")
}
`;

export default function ClaimPage() {
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<VaultSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{ vaultId: string; status: string; pkpAddress: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const LIT_API_KEY = process.env.NEXT_PUBLIC_LIT_API_KEY || "";

  useEffect(() => {
    const unsubscribe = fcl.currentUser().subscribe((user: any) => {
      const addr = user.addr || null;
      setWalletAddr(addr);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!walletAddr) return;
    fetchBeneficiaryVaults(walletAddr);
  }, [walletAddr]);

  async function fetchBeneficiaryVaults(addr: string) {
    setLoading(true);
    setError(null);
    setBeneficiaryVaults([]);

    try {
      const eventType = `A.${SHARD_CONTRACT_ADDRESS}.Shard.VaultCreated`;

      const blockRes = await fetch(`${FLOW_TESTNET_REST}/v1/blocks?height=sealed`);
      const blockData = await blockRes.json();
      const currentHeight = parseInt(blockData[0]?.header?.height || "0");

      const startHeight = Math.max(0, currentHeight - 2000);
      const endHeight = currentHeight;

      const eventsRes = await fetch(
        `${FLOW_TESTNET_REST}/v1/events?type=${encodeURIComponent(eventType)}&start_height=${startHeight}&end_height=${endHeight}`
      );

      if (!eventsRes.ok) {
        console.warn("Event query failed:", await eventsRes.text());
        setLoading(false);
        return;
      }

      const eventsData = await eventsRes.json();

      const allEvents: any[] = [];
      for (const blockEvents of eventsData) {
        for (const tx of blockEvents.events || []) {
          allEvents.push(tx);
        }
      }

      const myVaultEvents = allEvents.filter((e: any) => {
        const recoveryAddr = e.payload?.value?.fields?.find(
          (f: any) => f.name === "recoveryAddress"
        )?.value?.value;
        return recoveryAddr?.toLowerCase() === addr.toLowerCase() ||
               recoveryAddr?.toLowerCase() === addr.replace("0x", "").toLowerCase();
      });

      const vaults: VaultSummary[] = [];
      for (const event of myVaultEvents) {
        const fields = event.payload?.value?.fields || [];
        const ownerField = fields.find((f: any) => f.name === "owner");
        const vaultIdField = fields.find((f: any) => f.name === "vaultId");

        if (!ownerField || !vaultIdField) continue;

        const owner = ownerField.value?.value;
        const vaultId = vaultIdField.value?.value?.toString();

        if (!owner || !vaultId) continue;

        try {
          const vaultData = await fcl.query({
            cadence: GET_VAULT_DATA_SCRIPT,
            args: (arg: any, t: any) => [
              arg(owner, t.Address),
              arg(vaultId, t.UInt64),
            ],
          });

          vaults.push({
            id: vaultId,
            owner: owner,
            triggered: vaultData.triggered === true || vaultData.triggered === "true",
            recoveryWalletCID: vaultData.recoveryWalletCID || null,
            recoveryWalletAddress: vaultData.recoveryWalletAddress || null,
            inactivityPeriodDays: Math.floor(Number(vaultData.inactivityPeriodSeconds) / 86400),
          });
        } catch (e) {
          console.warn("Failed to fetch vault data for", owner, vaultId, e);
        }
      }

      setBeneficiaryVaults(vaults);
    } catch (e: any) {
      console.error("Error fetching beneficiary vaults:", e);
      setError("Failed to query vaults: " + (e.message || "unknown error"));
    }

    setLoading(false);
  }

  const handleClaim = async (vault: VaultSummary) => {
    if (!vault.triggered) {
      setError("Vault is not yet triggered");
      return;
    }
    if (!vault.recoveryWalletCID) {
      setError("No Lit Action CID found on this vault");
      return;
    }
    if (!LIT_API_KEY) {
      setError("Lit API key not configured");
      return;
    }

    setClaiming(vault.id);
    setError(null);
    setClaimResult(null);

    try {
      const result = await executeLitAction(LIT_API_KEY, vault.recoveryWalletCID, {
        vaultId: vault.id,
        flowContractAddress: SHARD_CONTRACT_ADDRESS,
        ownerAddress: vault.owner,
      });

      if (result.status === "TRIGGERED") {
        setClaimResult({
          vaultId: vault.id,
          status: "TRIGGERED",
          pkpAddress: vault.recoveryWalletAddress || "PKP address not set on contract",
        });
      } else {
        setError("Vault is not triggered according to Lit Protocol");
      }
    } catch (e: any) {
      console.error("Claim error:", e);
      setError("Claim failed: " + (e.message || "unknown error"));
    }

    setClaiming(null);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-6 py-24">
        <header className="mb-16">
          <Link href="/" className="text-xs font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors">
            &larr; Back
          </Link>
          <h1 className="text-3xl font-light mt-8">Claim Recovery</h1>
          <p className="font-mono text-xs text-neutral-600 mt-2">View vaults where you are beneficiary</p>
        </header>

        {!walletAddr ? (
          <div className="border border-neutral-800 p-8">
            <p className="font-mono text-sm text-neutral-500">Connect wallet to view beneficiary vaults</p>
          </div>
        ) : loading ? (
          <div className="border border-neutral-800 p-8">
            <p className="font-mono text-xs text-neutral-500 animate-pulse">Querying Flow VaultCreated events...</p>
          </div>
        ) : beneficiaryVaults.length === 0 ? (
          <div className="space-y-6">
            <div className="border border-neutral-800 p-8">
              <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">No Vaults Found</p>
              <p className="font-mono text-sm text-neutral-400">
                {walletAddr.slice(0, 8)}...{walletAddr.slice(-6)}
              </p>
            </div>
            <div className="border border-neutral-800 p-4">
              <p className="font-mono text-xs text-neutral-600">
                No vaults found where you are the beneficiary address
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest">
              {beneficiaryVaults.length} Vault{beneficiaryVaults.length !== 1 ? 's' : ''}
            </p>

            {beneficiaryVaults.map((vault) => (
              <div key={vault.id} className="border border-neutral-800 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">Vault</p>
                    <p className="font-mono text-lg">#{vault.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">Status</p>
                    <p className={`font-mono text-sm ${vault.triggered ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      {vault.triggered ? 'TRIGGERED' : 'Active'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <p className="text-xs font-mono text-neutral-600">Owner</p>
                    <p className="font-mono text-xs text-neutral-400">
                      {vault.owner.slice(0, 8)}...{vault.owner.slice(-6)}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-mono text-neutral-600">Inactivity Period</p>
                    <p className="font-mono text-xs text-neutral-400">{vault.inactivityPeriodDays} days</p>
                  </div>
                  {vault.recoveryWalletAddress && (
                    <div className="flex justify-between">
                      <p className="text-xs font-mono text-neutral-600">Recovery Wallet</p>
                      <p className="font-mono text-xs text-neutral-400 truncate max-w-[200px]">
                        {vault.recoveryWalletAddress.slice(0, 10)}...
                      </p>
                    </div>
                  )}
                </div>

                {vault.triggered ? (
                  <div
                    onClick={() => handleClaim(vault)}
                    className={`border border-neutral-800 px-6 py-3 transition-colors cursor-pointer ${
                      claiming === vault.id ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-600'
                    }`}
                  >
                    <span className="font-mono text-sm text-neutral-300 uppercase tracking-widest">
                      {claiming === vault.id ? 'Running Lit Action...' : 'Claim Recovery Access'}
                    </span>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-neutral-600">
                    Triggers after {vault.inactivityPeriodDays} days of no heartbeat
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="border border-neutral-800 p-4 mt-8">
            <p className="font-mono text-xs text-neutral-400">{error}</p>
          </div>
        )}

        {claimResult && (
          <div className="border border-neutral-800 p-6 mt-8 space-y-4">
            <div>
              <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">Access Granted</p>
              <p className="font-mono text-sm text-neutral-300">Vault #{claimResult.vaultId}</p>
            </div>
            <div className="border-t border-neutral-800 pt-4">
              <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-2">Recovery Wallet (PKP)</p>
              <p className="font-mono text-xs text-neutral-400 break-all">{claimResult.pkpAddress}</p>
            </div>
            <div className="border-t border-neutral-800 pt-4">
              <p className="text-xs font-mono text-neutral-600">
                Use the Lit SDK with the signed proof to authorize transactions from this address
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}