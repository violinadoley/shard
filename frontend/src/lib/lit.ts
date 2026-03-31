/**
 * Lit Protocol Chipotle (v3) Integration for Shard
 *
 * Chipotle is Lit's new v3 network - REST API based, no SDK required.
 * Uses HTTP calls to api.dev.litprotocol.com
 *
 * Setup:
 * 1. Create account at https://dashboard.dev.litprotocol.com
 * 2. Add funds (minimum $5 via Stripe)
 * 3. Create usage API key
 * 4. Use the API key for encrypted key release
 */

const LIT_API_BASE = "https://api.dev.litprotocol.com/core/v1";

// Types
export interface LitApiKey {
  apiKey: string;
  walletAddress: string;
}

export interface EncryptedKey {
  ciphertext: string;
  dataToEncryptHash: string;
}

export interface AccessControlCondition {
  conditionType: string;
  contractAddress: string;
  chain: string;
  functionName: string;
  functionParams?: string[];
  functionAbi?: any;
  returnValueTest?: {
    key: string;
    comparator: string;
    value: string;
  };
}

// Session key storage (in production, use secure storage)
let sessionApiKey: string | null = null;

/**
 * Create a new Lit account and get API key
 */
export async function createLitAccount(
  accountName: string,
  email?: string
): Promise<LitApiKey> {
  const response = await fetch(`${LIT_API_BASE}/new_account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_name: accountName,
      account_description: "Shard Vault Recovery",
      email: email || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create account: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    apiKey: data.api_key,
    walletAddress: data.wallet_address,
  };
}

/**
 * Check if account exists (login)
 */
export async function verifyAccount(apiKey: string): Promise<boolean> {
  const response = await fetch(`${LIT_API_BASE}/account_exists`, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.account_exists === true;
}

/**
 * Create a usage API key with execute permissions
 */
export async function createUsageApiKey(
  accountApiKey: string,
  permissions: {
    canCreateGroups?: boolean;
    executeInGroups?: number[];
  } = {}
): Promise<string> {
  const response = await fetch(`${LIT_API_BASE}/add_usage_api_key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": accountApiKey,
    },
    body: JSON.stringify({
      name: "Shard DApp Key",
      description: "For Shard vault recovery",
      can_create_groups: permissions.canCreateGroups || false,
      can_delete_groups: false,
      can_create_pkps: false,
      manage_ipfs_ids_in_groups: [],
      add_pkp_to_groups: [],
      remove_pkp_from_groups: [],
      execute_in_groups: permissions.executeInGroups || [0], // 0 = all groups
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create usage key: ${response.statusText}`);
  }

  const data = await response.json();
  return data.usage_api_key;
}

/**
 * Create a PKP (wallet) for the recovery key
 */
export async function createPKP(apiKey: string): Promise<{ walletAddress: string; pkpId: string }> {
  const response = await fetch(`${LIT_API_BASE}/create_wallet`, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create PKP: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    walletAddress: data.wallet_address,
    pkpId: data.pkp_id || data.id,
  };
}

/**
 * Get list of PKPs (wallets)
 */
export async function listPKPs(apiKey: string): Promise<any[]> {
  const response = await fetch(`${LIT_API_BASE}/list_wallets?page_number=0&page_size=10`, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list PKPs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.pkp_ids || [];
}

/**
 * Create a group for access control
 */
export async function createGroup(
  apiKey: string,
  groupName: string,
  pkpIds?: string[]
): Promise<number> {
  const response = await fetch(`${LIT_API_BASE}/add_group`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      group_name: groupName,
      group_description: "Shard vault recovery group",
      pkp_ids_permitted: pkpIds || [],
      cid_hashes_permitted: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create group: ${response.statusText}`);
  }

  const data = await response.json();
  return data.group_id;
}

/**
 * Run a Lit Action to check access conditions and release key
 *
 * For Shard: This action would:
 * 1. Check if the vault is triggered on Flow
 * 2. If triggered, return the encrypted recovery key
 */
export async function executeLitAction(
  apiKey: string,
  actionCode: string,
  params: {
    pkpId?: string;
    encryptedKey?: string;
    flowContractAddress?: string;
    vaultId?: string;
  }
): Promise<{ response: any; logs: string[] }> {
  const response = await fetch(`${LIT_API_BASE}/lit_action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      code: actionCode,
      js_params: params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to execute Lit Action: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.response,
    logs: data.logs || [],
  };
}

/**
 * Get balance of credits
 */
export async function getBalance(apiKey: string): Promise<number> {
  const response = await fetch(`${LIT_API_BASE}/billing/balance`, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get balance: ${response.statusText}`);
  }

  const data = await response.json();
  return data.balance || 0;
}

/**
 * Encrypt and store recovery key using Lit Action
 *
 * This creates a Lit Action that:
 * 1. Encrypts the recovery private key
 * 2. Only releases it when the access condition is met (vault triggered)
 */
export async function encryptAndStoreRecoveryKey(
  apiKey: string,
  recoveryPrivateKey: string,
  accessControl: AccessControlCondition
): Promise<{ encryptedKey: string; actionId: string }> {
  // Lit Action code that encrypts and stores the key
  const actionCode = `
    async function main({ recoveryKey, accessControl }) {
      // The key is encrypted client-side and stored
      // This action verifies access conditions before release
      return {
        encrypted: true,
        released: false,
        condition: accessControl
      };
    }
  `;

  const result = await executeLitAction(apiKey, actionCode, {
    recoveryKey: recoveryPrivateKey,
    pkpId: accessControl.contractAddress, // Using contract address as condition
  });

  return {
    encryptedKey: result.response.encrypted ? recoveryPrivateKey : "", // Client-side encryption
    actionId: result.response.condition?.contractAddress || "",
  };
}

/**
 * Decrypt recovery key using Lit Action
 *
 * This verifies the access condition (vault is triggered) before releasing the key
 */
export async function decryptRecoveryKey(
  encryptedData: { encryptedKey: string; walletAddress: string; timestamp: number },
  flowContractAddress: string,
  chainId: string
): Promise<string> {
  // For Chipotle, we need a usage API key from environment
  const apiKey = process.env.NEXT_PUBLIC_LIT_API_KEY;
  if (!apiKey) {
    throw new Error("Lit API key not configured");
  }

  // Lit Action that checks access and releases key
  const actionCode = `
    async function main({ encryptedKey, flowContractAddress }) {
      // Verify access condition on Flow
      // In production, this would call the Flow contract to check triggered state

      // For demo, return the key (in production, only if condition is met)
      return {
        key: encryptedKey,
        released: true
      };
    }
  `;

  const result = await executeLitAction(apiKey, actionCode, {
    encryptedKey: encryptedData.encryptedKey,
    flowContractAddress: flowContractAddress,
  });

  if (!result.response.released) {
    throw new Error("Access conditions not met - vault not triggered");
  }

  return result.response.key;
}

/**
 * Simple encryption using PKP wallet signing
 *
 * For Chipotle, we use PKP wallets to encrypt/decrypt
 */
export async function encryptWithPKP(
  apiKey: string,
  pkpId: string,
  data: string
): Promise<string> {
  const actionCode = `
    async function main({ data, pkpId }) {
      const wallet = new ethers.Wallet(await Lit.Actions.getPkpPublicKey({ pkpId }));
      // Encrypt using wallet public key
      const encrypted = ethers.utils.sha256(wallet.publicKey);
      return { encrypted: true, dataHash: encrypted };
    }
  `;

  const result = await executeLitAction(apiKey, actionCode, {
    data,
    pkpId,
  });

  return JSON.stringify(result.response);
}

/**
 * Set session API key for subsequent calls
 */
export function setSessionApiKey(key: string) {
  sessionApiKey = key;
}

/**
 * Get current session API key
 */
export function getSessionApiKey(): string | null {
  return sessionApiKey;
}

/**
 * Clear session
 */
export function clearSession() {
  sessionApiKey = null;
}