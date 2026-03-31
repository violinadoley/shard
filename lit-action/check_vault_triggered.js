/**
 * Shard — Lit Action for Vault Recovery
 *
 * This JS file runs on Lit Protocol Chipotle nodes.
 * It checks if a Shard vault on Flow testnet is triggered.
 * If triggered, it signs with the PKP to prove access.
 *
 * jsParams expected:
 *   vaultId             — string, the vault ID (e.g. "1")
 *   flowContractAddress — string, Flow testnet contract address (e.g. "ec3c1566d2b4bb6c")
 *   ownerAddress        — string, the vault owner's Flow address
 *
 * Upload this file to Storacha/IPFS.
 * The CID is stored on the Flow contract and used when claiming.
 */

const go = async () => {
  const FLOW_TESTNET_REST = "https://rest-testnet.onflow.org";

  // Cadence script encoded as base64 to check triggered state
  // This is the is_triggered.cdc script
  const IS_TRIGGERED_SCRIPT = `
import Shard from 0x${jsParams.flowContractAddress}

access(all) fun main(owner: Address, vaultId: UInt64): Bool {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
    if vaultOwner == nil { return false }
    return vaultOwner!.getVaultTriggered(vaultId) ?? false
}
  `.trim();

  // Base64 encode the script (Lit nodes have btoa)
  const scriptB64 = btoa(IS_TRIGGERED_SCRIPT);

  // Encode arguments as Flow JSON-CDC
  const ownerArg = {
    type: "Address",
    value: "0x" + jsParams.ownerAddress.replace("0x", "")
  };
  const vaultIdArg = {
    type: "UInt64",
    value: jsParams.vaultId.toString()
  };
  const argsB64 = btoa(JSON.stringify([ownerArg, vaultIdArg]));

  // Call Flow testnet REST API to execute the script
  let triggered = false;
  try {
    const response = await fetch(`${FLOW_TESTNET_REST}/v1/scripts?block_height=sealed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: scriptB64,
        arguments: [btoa(JSON.stringify(ownerArg)), btoa(JSON.stringify(vaultIdArg))]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      Lit.Actions.setResponse({ response: JSON.stringify({ error: "Flow API error: " + errText }) });
      return;
    }

    const result = await response.json();
    // Flow REST returns value as base64-encoded JSON-CDC
    // Parse: result.value is a base64 string of the Cadence JSON
    const decoded = atob(result.value);
    const parsed = JSON.parse(decoded);
    triggered = parsed.value === true || parsed.value === "true";
  } catch (e) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Failed to query Flow: " + e.message }) });
    return;
  }

  if (!triggered) {
    Lit.Actions.setResponse({ response: JSON.stringify({ status: "NOT_TRIGGERED", vaultId: jsParams.vaultId }) });
    return;
  }

  // Vault IS triggered — sign with the PKP to prove access
  // The signature proves the beneficiary has rights to the recovery wallet
  const message = "shard-vault-claim-" + jsParams.vaultId + "-" + jsParams.ownerAddress;
  const msgHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  const msgHashHex = Array.from(new Uint8Array(msgHash)).map(b => b.toString(16).padStart(2, "0")).join("");

  await Lit.Actions.signEcdsa({
    toSign: msgHashHex,
    publicKey: pkpPublicKey,
    sigName: "shard_claim_sig"
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      status: "TRIGGERED",
      vaultId: jsParams.vaultId,
      message: "PKP signed — vault access granted"
    })
  });
};

go();
