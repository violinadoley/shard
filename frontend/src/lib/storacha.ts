import { create, Client } from "@web3-storage/w3up-client";

let client: Client | null = null;

export async function getStorachaClient(): Promise<Client> {
  if (client) return client;

  client = await create();
  return client;
}

export async function uploadEncryptedKey(encryptedBlob: Blob): Promise<string> {
  const storachaClient = await getStorachaClient();

  const cid = await storachaClient.uploadFile(encryptedBlob, {
    retries: 3,
  });

  return cid.toString();
}

export async function downloadEncryptedKey(cid: string): Promise<Blob> {
  const storachaClient = await getStorachaClient();

  const blob = await storachaClient.capability.store.get(cid as any);

  if (!blob) {
    throw new Error("Failed to retrieve encrypted key from Storacha");
  }

  return blob;
}

export async function createAndRegisterSpace(email: string): Promise<void> {
  const storachaClient = await getStorachaClient();

  const space = await storachaClient.createSpace("shard-vault");

  await storachaClient.setCurrentSpace(space.did());

  await storachaClient.registerSpace(email);
}

export async function listUploads(): Promise<any[]> {
  const storachaClient = await getStorachaClient();

  const uploads = await storachaClient.capability.upload.list();

  return uploads.results;
}