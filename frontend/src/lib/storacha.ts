import { create, Client } from "@web3-storage/w3up-client";

let client: Client | null = null;

const SPACE_DID = process.env.NEXT_PUBLIC_STORACHA_SPACE as `did:${string}:${string}` | undefined;

export async function getStorachaClient(): Promise<Client> {
  if (client) return client;
  client = await create();
  return client;
}

/**
 * Login to Storacha with email and set the active space.
 * Call this once (user clicks "authorize" in their email).
 * In production this would be done at app startup or on-demand.
 */
export async function loginStoracha(email: string): Promise<void> {
  const storachaClient = await getStorachaClient();
  await storachaClient.login(email as `${string}@${string}`);
  if (SPACE_DID) {
    await storachaClient.setCurrentSpace(SPACE_DID);
  }
}

/**
 * Upload a file to Storacha (IPFS/Filecoin) and return the CID string.
 * The CID is used by Lit Protocol to fetch the Lit Action JS.
 */
export async function uploadToStoracha(blob: Blob, filename?: string): Promise<string> {
  const storachaClient = await getStorachaClient();
  const file = filename
    ? new File([blob], filename, { type: blob.type })
    : blob;
  const cid = await storachaClient.uploadFile(file as File, { retries: 3 });
  return cid.toString();
}

// Legacy alias kept for compatibility
export async function uploadEncryptedKey(encryptedBlob: Blob): Promise<string> {
  return uploadToStoracha(encryptedBlob, "lit-action.js");
}

/**
 * Download a file from Storacha/IPFS by CID.
 * Uses the public w3s.link gateway — no auth needed for reads.
 * Fixed: capability.store.get() returns shard metadata, not file content.
 */
export async function downloadFromStoracha(cid: string): Promise<Blob> {
  const url = `https://w3s.link/ipfs/${cid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CID ${cid} from gateway: ${response.statusText}`);
  }
  return response.blob();
}

// Legacy alias
export async function downloadEncryptedKey(cid: string): Promise<Blob> {
  return downloadFromStoracha(cid);
}

/**
 * Upload the Lit Action JS file from its local path as text.
 * Returns the IPFS CID to be stored on the Flow contract.
 */
export async function uploadLitAction(jsCode: string): Promise<string> {
  const blob = new Blob([jsCode], { type: "application/javascript" });
  return uploadToStoracha(blob, "check_vault_triggered.js");
}

export async function listUploads(): Promise<any[]> {
  const storachaClient = await getStorachaClient();
  const uploads = await storachaClient.capability.upload.list();
  return uploads.results;
}
