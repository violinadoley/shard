import { fcl } from "./flow";
import { encryptRecoveryKey, decryptRecoveryKey, EncryptedData } from "./lit";
import { uploadEncryptedKey, downloadEncryptedKey } from "./storacha";
import { ethers } from "ethers";

const SET_RECOVERY_CID_CODE = `
import "Shard"

transaction(recoveryWalletCID: String) {
  prepare(signer: auth(Storage, Capabilities) &Account) {
    let vault = Shard.account.storage.borrow<&Shard.Vault>(
      from: /storage/shardVaults
    ) ?? panic("Vault not found")
    
    vault.setRecoveryWalletCID(recoveryWalletCID)
    log("Recovery wallet CID set")
  }
}
`;

export interface VaultSetupResult {
  vaultId: number;
  recoveryWalletAddress: string;
  recoveryWalletCID: string;
}

export async function setupVaultWithRecovery(
  recoveryAddress: string,
  inactivityDays: number,
  contractAddress: string,
  ethersSigner: ethers.Signer
): Promise<VaultSetupResult> {
  const wallet = ethers.Wallet.createRandom();
  const recoveryPrivateKey = wallet.privateKey;
  const recoveryWalletAddress = wallet.address;

  console.log("Generated recovery wallet:", recoveryWalletAddress);

  const encryptedData = await encryptRecoveryKey(recoveryPrivateKey, contractAddress);

  const blob = new Blob([JSON.stringify(encryptedData)], {
    type: "application/json",
  });
  const cid = await uploadEncryptedKey(blob);
  console.log("Uploaded encrypted key to Storacha, CID:", cid);

  const transactionId = await fcl.send([
    fcl.transaction(SET_RECOVERY_CID_CODE),
    fcl.args([fcl.arg(cid, t.String)]),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.payer(fcl.currentUser().authorization),
    fcl.authorizations([fcl.currentUser().authorization]),
    fcl.limit(9999),
  ]);

  await fcl.tx(transactionId).onceSealed();
  console.log("CID stored on Flow contract");

  return {
    vaultId: 1,
    recoveryWalletAddress,
    recoveryWalletCID: cid,
  };
}

export async function claimRecovery(
  ethersSigner: ethers.Signer
): Promise<string> {
  const encryptedBlob = await downloadEncryptedKey("placeholder-cid");

  const encryptedData: EncryptedData = {
    ciphertext: "placeholder",
    dataToEncryptHash: "placeholder",
    accessControlConditions: [],
  };

  const privateKey = await decryptRecoveryKey(encryptedData, ethersSigner);
  return privateKey;
}

import * as t from "@onflow/types";