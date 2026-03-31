import {
  LitNodeClient,
  encryptString,
  decryptToString,
  AuthManager,
} from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";

const LIT_NETWORK = "nagaDev";

// Flow EVM testnet chain ID
const FLOW_EVM_CHAIN = "flowEVM";

let litClient: LitNodeClient | null = null;

export async function initLitClient(): Promise<LitNodeClient> {
  if (litClient) return litClient;

  litClient = new LitNodeClient({
    litNetwork: LIT_NETWORK,
    debug: false,
  });

  await litClient.connect();
  return litClient;
}

export async function getAuthContext(ethersSigner: ethers.Signer) {
  const client = await initLitClient();
  const address = await ethersSigner.getAddress();

  const authManager = new AuthManager({
    litNodeClient: client,
    config: {
      account: address,
    },
  });

  return await authManager.createEoaAuthContext({
    config: {
      account: address,
    },
    authConfig: {
      domain: typeof window !== "undefined" ? window.location.host : "localhost",
      statement: "Sign to access your Shard recovery key",
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      resources: {
        "lit-action-execution": "*",
        "access-control-condition-decryption": "*",
      } as any,
    },
    ethersSigner,
  } as any);
}

export interface EncryptedData {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any[];
}

/**
 * Encrypts a recovery key with Lit Protocol access control.
 * Access is granted when the vault's triggered field is true on Flow EVM.
 *
 * NOTE: Lit access conditions check EVM contracts. For Flow, we need to either:
 * 1. Deploy a simple view contract on Flow EVM that mirrors the triggered state
 * 2. Use a timelock-based approach as a fallback
 * 3. Use Lit Actions for more complex logic
 */
export async function encryptRecoveryKey(
  recoveryPrivateKey: string,
  contractAddress: string, // Flow EVM address of the vault contract
  chainId: string = "545" // Flow EVM testnet chain ID
): Promise<EncryptedData> {
  const client = await initLitClient();

  // Access control condition: check if vault is triggered on Flow EVM
  // This requires a view function on a Flow EVM contract
  const accessControlConditions = [
    {
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

  const encryptedData = await encryptString({
    client,
    unifiedAccessControlConditions: accessControlConditions,
    dataToEncrypt: recoveryPrivateKey,
    chain: chainId,
  });

  return {
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    accessControlConditions,
  };
}

export async function decryptRecoveryKey(
  encryptedData: EncryptedData,
  ethersSigner: ethers.Signer,
  chainId: string = "545"
): Promise<string> {
  const client = await initLitClient();
  const authContext = await getAuthContext(ethersSigner);

  const decryptedString = await decryptToString({
    client,
    unifiedAccessControlConditions: encryptedData.accessControlConditions,
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    authContext,
    chain: chainId,
  });

  return decryptedString;
}

/**
 * Fallback encryption using timelock.
 * If EVM contract check fails, use a simple timelock condition.
 */
export async function encryptRecoveryKeyWithTimelock(
  recoveryPrivateKey: string,
  unlockTimestamp: number // Unix timestamp when key becomes available
): Promise<EncryptedData> {
  const client = await initLitClient();

  const accessControlConditions = [
    {
      conditionType: "evmContract",
      contractAddress: "0x0000000000000000000000000000000000000000",
      chain: "ethereum",
      functionName: "timestamp",
      functionParams: [":userAddress"],
      functionAbi: {
        type: "constructor",
        stateMutability: "view",
      },
      returnValueTest: {
        key: "",
        comparator: ">=",
        value: unlockTimestamp.toString(),
      },
    },
  ];

  const encryptedData = await encryptString({
    client,
    unifiedAccessControlConditions: accessControlConditions as any,
    dataToEncrypt: recoveryPrivateKey,
    chain: "ethereum",
  });

  return {
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    accessControlConditions,
  };
}

export async function disconnectLitClient() {
  if (litClient) {
    litClient.disconnect();
    litClient = null;
  }
}