/**
 * Lit Protocol Chipotle (v3) Integration for Shard
 *
 * Chipotle is Lit's v3 network — REST API only, no SDK.
 * All calls go to https://api.dev.litprotocol.com/core/v1
 *
 * IMPORTANT: Naga is sunset April 1, 2026. Use Chipotle only.
 * IMPORTANT: executeLitAction uses ipfs_id (CID), NOT inline code.
 */

const LIT_API_BASE = "https://api.dev.litprotocol.com/core/v1";

export interface PKPWallet {
  pkpId: string;
  walletAddress: string;
}

export interface LitActionResult {
  status: "TRIGGERED" | "NOT_TRIGGERED" | "ERROR";
  signature?: any;
  response?: string;
  logs?: string[];
}

/**
 * Create a new PKP (Programmable Key Pair) — the recovery wallet.
 * No private key ever exists. The key lives on Lit nodes.
 * Returns the PKP wallet address (safe to share publicly).
 */
export async function createPKP(apiKey: string): Promise<PKPWallet> {
  const response = await fetch(`${LIT_API_BASE}/create_wallet`, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create PKP (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    walletAddress: data.wallet_address,
    pkpId: data.pkp_id || data.id,
  };
}

/**
 * Execute a Lit Action by IPFS CID.
 *
 * For Shard: this runs check_vault_triggered.js which:
 *  1. Calls Flow testnet to check if vault.triggered == true
 *  2. If yes: PKP signs, returns proof of access
 *  3. If no: returns NOT_TRIGGERED
 *
 * Chipotle requires ipfs_id (CID on IPFS), NOT inline code.
 */
export async function executeLitAction(
  apiKey: string,
  ipfsCid: string,
  jsParams: {
    vaultId: string;
    flowContractAddress: string;
    ownerAddress: string;
  }
): Promise<LitActionResult> {
  const response = await fetch(`${LIT_API_BASE}/lit_action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      ipfs_id: ipfsCid,
      js_params: jsParams,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to execute Lit Action (${response.status}): ${text}`);
  }

  const data = await response.json();

  // Parse the response from the Lit Action
  let parsedResponse: any = {};
  try {
    parsedResponse = typeof data.response === "string"
      ? JSON.parse(data.response)
      : data.response;
  } catch {
    parsedResponse = { raw: data.response };
  }

  return {
    status: parsedResponse.status === "TRIGGERED" ? "TRIGGERED" : "NOT_TRIGGERED",
    signature: data.signatures?.shard_claim_sig,
    response: data.response,
    logs: data.logs || [],
  };
}

/**
 * Get the balance of Lit credits for this API key.
 * Minimum $5 needed to create PKPs and run actions.
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
 * List PKP wallets for this API key.
 */
export async function listPKPs(apiKey: string): Promise<PKPWallet[]> {
  const response = await fetch(`${LIT_API_BASE}/list_wallets?page_number=0&page_size=10`, {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list PKPs: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.pkp_ids || []).map((w: any) => ({
    pkpId: w.pkp_id || w.id,
    walletAddress: w.wallet_address,
  }));
}
