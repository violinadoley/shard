/**
 * Lit Protocol v8 Integration for Shard
 *
 * IMPORTANT: Lit v8 (Naga) has a different API than v7.
 * Uses litClient.encrypt() and litClient.decrypt() instead of standalone functions.
 */

import * as LitSdk from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";

const LIT_NETWORK = "nagaDev";

// Flow EVM testnet chain ID
const FLOW_EVM_CHAIN_ID = "545";

let litClient: LitSdk.LitNodeClient | null = null;

export interface EncryptedData {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any[];
  chainId: string;
}

/**
 * Initialize and connect to Lit network
 */
export async function initLitClient(): Promise<LitSdk.LitNodeClient> {
  if (litClient && litClient.isConnected()) {
    return litClient;
  }

  litClient = new LitSdk.LitNodeClient({
    litNetwork: LIT_NETWORK,
    debug: false,
  });

  await litClient.connect();
  return litClient;
}

/**
 * Get EOA Auth Context for Lit
 */
async function getEoaAuthContext(ethersSigner: ethers.Signer) {
  const client = await initLitClient();
  const address = await ethersSigner.getAddress();

  // For EOA wallets (MetaMask), we create a basic auth context
  const authSig = await ethersSigner.signMessage(
    `Sign to access your Shard recovery key\n\nWallet address: ${address}\n\nThis signature is used to authenticate with Lit Protocol.`
  );

  return {
    sig: authSig,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: `Sign to access your Shard recovery key`,
    address: address,
  };
}

/**
 * Encrypt a recovery key with Lit Protocol access control.
 * Access is granted when the vault's triggered field is true on Flow EVM.
 */
export async function encryptRecoveryKey(
  recoveryPrivateKey: string,
  contractAddress: string,
  chainId: string = FLOW_EVM_CHAIN_ID
): Promise<EncryptedData> {
  const client = await initLitClient();

  // Access control condition: check if vault is triggered
  const accessControlConditions = [
    {
      conditionType: "evmContractCondition",
      contractAddress: contractAddress,
      chain: chainId,
      functionName: "isTriggered",
      functionParams: [],
      functionAbi: {
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "bool" }],
      },
      returnValueTest: {
        key: "",
        comparator: "=",
        value: "true",
      },
    },
  ];

  // Lit v8 encrypts using the client
  const result = await client.encrypt({
    unifiedAccessControlConditions: accessControlConditions,
    dataToEncrypt: new TextEncoder().encode(recoveryPrivateKey),
    chain: chainId,
  });

  return {
    ciphertext: result.ciphertext,
    dataToEncryptHash: result.dataToEncryptHash,
    accessControlConditions,
    chainId,
  };
}

/**
 * Decrypt a recovery key using Lit Protocol.
 * Only works if the access conditions are met (vault is triggered).
 */
export async function decryptRecoveryKey(
  encryptedData: EncryptedData,
  ethersSigner: ethers.Signer
): Promise<string> {
  const client = await initLitClient();
  const authSig = await getEoaAuthContext(ethersSigner);

  const decrypted = await client.decrypt({
    unifiedAccessControlConditions: encryptedData.accessControlConditions,
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    authSig,
    chain: encryptedData.chainId,
  });

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Fallback: Encrypt with a simple access control condition.
 * This is used if the EVM contract integration is not available.
 */
export async function encryptWithAccessControl(
  data: string,
  accessControlConditions: any[],
  chainId: string = FLOW_EVM_CHAIN_ID
): Promise<EncryptedData> {
  const client = await initLitClient();

  const result = await client.encrypt({
    unifiedAccessControlConditions: accessControlConditions,
    dataToEncrypt: new TextEncoder().encode(data),
    chain: chainId,
  });

  return {
    ciphertext: result.ciphertext,
    dataToEncryptHash: result.dataToEncryptHash,
    accessControlConditions,
    chainId,
  };
}

/**
 * Disconnect from Lit network
 */
export async function disconnectLitClient() {
  if (litClient) {
    litClient.disconnect();
    litClient = null;
  }
}

/**
 * Check if Lit client is connected
 */
export function isLitConnected(): boolean {
  return litClient !== null && litClient.isConnected();
}