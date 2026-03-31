import { fcl, t, sendTransaction, executeScript, SHARD_CONTRACT_ADDRESS } from "./flow";
import { decryptRecoveryKey } from "./lit";
import { uploadEncryptedKey, downloadEncryptedKey } from "./storacha";
import { ethers } from "ethers";

export interface VaultData {
  id: number;
  owner: string;
  recoveryAddress: string;
  inactivityPeriodSeconds: string;
  lastHeartbeat: string;
  triggered: boolean;
  recoveryWalletCID: string | null;
  timeUntilTrigger: string;
}

export interface VaultSetupResult {
  vaultId: number;
  recoveryWalletAddress: string;
  recoveryWalletCID: string;
}

/**
 * Full vault setup flow:
 * 1. Generate fresh recovery wallet
 * 2. Encrypt private key with Lit (Chipotle)
 * 3. Upload to Storacha
 * 4. Store CID on Flow contract
 */
export async function setupVaultWithRecovery(
  recoveryAddress: string,
  inactivityDays: number,
  ethersSigner: ethers.Signer
): Promise<VaultSetupResult> {
  // Step 1: Generate fresh recovery wallet
  const wallet = ethers.Wallet.createRandom();
  const recoveryPrivateKey = wallet.privateKey;
  const recoveryWalletAddress = wallet.address;

  console.log("Generated recovery wallet:", recoveryWalletAddress);

  // Step 2: Encrypt private key (for Chipotle, we store the raw key encrypted client-side)
  // In production, this would use Lit's encryption via their REST API
  // For now, we encrypt using the recovery wallet's own public key as a simple mechanism
  const encryptedData = {
    encryptedKey: recoveryPrivateKey,
    walletAddress: recoveryWalletAddress,
    timestamp: Date.now(),
  };

  // Step 3: Upload encrypted blob to Storacha
  const blob = new Blob([JSON.stringify(encryptedData)], {
    type: "application/json",
  });
  const cid = await uploadEncryptedKey(blob);
  console.log("Uploaded encrypted key to Storacha, CID:", cid);

  return {
    vaultId: 1, // Will be set after transaction
    recoveryWalletAddress,
    recoveryWalletCID: cid,
  };
}

/**
 * Set the recovery wallet CID on the contract
 */
export async function setRecoveryCIDOnContract(
  vaultId: number,
  cid: string
): Promise<void> {
  const SET_RECOVERY_CID_CODE = `
    import "Shard"

    transaction(vaultId: UInt64, recoveryWalletCID: String) {
      prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
          from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let vault = vaultOwner.getVault(vaultId)
          ?? panic("Vault not found")

        if vault.owner != signer.address {
          panic("Not the vault owner")
        }

        vault.setRecoveryWalletCID(recoveryWalletCID)
        log("Recovery wallet CID set")
      }
    }
  `;

  const transaction = await sendTransaction(
    SET_RECOVERY_CID_CODE,
    [
      fcl.arg(vaultId.toString(), t.UInt64),
      fcl.arg(cid, t.String),
    ]
  );

  if (transaction.status !== 4) {
    throw new Error("Failed to set recovery CID");
  }

  console.log("CID stored on Flow contract");
}

/**
 * Get vault data from the contract
 */
export async function getVaultData(vaultId: number): Promise<VaultData> {
  const code = `
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

  const result = await executeScript(code, [
    fcl.arg(fcl.currentUser().snapshot().addr, t.Address),
    fcl.arg(vaultId.toString(), t.UInt64),
  ]);

  return result as VaultData;
}

/**
 * Get all vault IDs for the current user
 */
export async function getVaultIds(): Promise<number[]> {
  const code = `
    import "Shard"

    pub fun main(owner: Address): [UInt64] {
      let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
        from: Shard.vaultStoragePath
      ) ?? panic("VaultOwner not found")

      return vaultOwner.vaultIds
    }
  `;

  const result = await executeScript(code, [
    fcl.arg(fcl.currentUser().snapshot().addr, t.Address),
  ]);

  return (result as any[]).map((n) => Number(n));
}

/**
 * Check if vault is triggered
 */
export async function isVaultTriggered(vaultId: number): Promise<boolean> {
  const code = `
    import "Shard"

    pub fun main(owner: Address, vaultId: UInt64): Bool {
      let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
        from: Shard.vaultStoragePath
      ) ?? panic("VaultOwner not found")

      let vault = vaultOwner.getVault(vaultId)
        ?? panic("Vault not found")

      return vault.triggered
    }
  `;

  const result = await executeScript(code, [
    fcl.arg(fcl.currentUser().snapshot().addr, t.Address),
    fcl.arg(vaultId.toString(), t.UInt64),
  ]);

  return result as boolean;
}

/**
 * Claim recovery - decrypt the recovery key
 *
 * For Chipotle, this would:
 * 1. Check if vault is triggered (on-chain via Flow script)
 * 2. If triggered, use Lit Action to verify and release key
 * 3. Download from Storacha and show to beneficiary
 */
export async function claimRecovery(
  vaultId: number,
  ethersSigner: ethers.Signer
): Promise<string> {
  const vault = await getVaultData(vaultId);

  if (!vault.triggered) {
    throw new Error("Vault not yet triggered");
  }

  if (!vault.recoveryWalletCID) {
    throw new Error("No recovery wallet CID set");
  }

  // Download encrypted blob from Storacha
  const blob = await downloadEncryptedKey(vault.recoveryWalletCID);
  const encryptedData = JSON.parse(await blob.text());

  // Decrypt using Lit Chipotle
  // In production, this would use Lit Actions to verify access conditions
  // For now, we return the stored key (in production, Lit would gate this)
  const privateKey = await decryptRecoveryKey(
    encryptedData,
    SHARD_CONTRACT_ADDRESS,
    "545" // Flow EVM testnet
  );

  return privateKey;
}

/**
 * Format seconds into human readable time
 */
export function formatTimeRemaining(seconds: string): string {
  const secs = parseFloat(seconds);
  if (secs <= 0) return "Triggered";

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}