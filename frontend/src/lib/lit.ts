import {
  LitNodeClient,
  encryptString,
  decryptToString,
  AuthManager,
} from "@lit-protocol/lit-node-client";
import { ethers } from "ethers";

const LIT_NETWORK = "nagaDev";

let litClient: LitNodeClient | null = null;
let authManager: AuthManager | null = null;

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

  authManager = new AuthManager({
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
      statement: "Sign to access your recovery key",
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

export async function encryptRecoveryKey(
  recoveryPrivateKey: string,
  contractAddress: string
): Promise<EncryptedData> {
  const client = await initLitClient();

  const accessControlConditions = [
    {
      contractAddress: contractAddress,
      chain: "ethereum",
      functionName: "triggered",
      functionParams: [":userAddress"],
      functionAbi: {
        type: "function",
        stateMutability: "view",
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
    chain: "ethereum",
  });

  return {
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    accessControlConditions,
  };
}

export async function decryptRecoveryKey(
  encryptedData: EncryptedData,
  ethersSigner: ethers.Signer
): Promise<string> {
  const client = await initLitClient();

  const authContext = await getAuthContext(ethersSigner);

  const decryptedString = await decryptToString({
    client,
    unifiedAccessControlConditions: encryptedData.accessControlConditions,
    ciphertext: encryptedData.ciphertext,
    dataToEncryptHash: encryptedData.dataToEncryptHash,
    authContext,
    chain: "ethereum",
  });

  return decryptedString;
}

export async function disconnectLitClient() {
  if (litClient) {
    litClient.disconnect();
    litClient = null;
    authManager = null;
  }
}