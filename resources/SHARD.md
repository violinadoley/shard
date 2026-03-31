# Shard — Dead Man's Switch Wallet Recovery

**PL Genesis Hackathon Project**

---

## The Problem

People lose access to crypto. People die. Families cannot recover assets. Existing solutions require external keepers or trust in third parties.

## The Solution

A self-custodial vault that **wakes up on its own** if you stop checking in.

- No keepers — Flow scheduled transactions self-trigger
- No private key ever exists — recovery wallet is a Lit PKP
- Deep sponsor integration — Flow Forte + Lit Chipotle + Storacha

---

## Correct Architecture (Updated)

### What the Recovery Wallet Actually Is

**Wrong (old approach):** Generate an ethers wallet (`ethers.Wallet.createRandom()`), store the private key encrypted somewhere, decrypt it later.

**Correct approach:** The recovery wallet is a **Lit PKP (Programmable Key Pair)**:
- Created via Lit API → `POST /core/v1/create_wallet`
- No private key is ever held by anyone
- The key is split across Lit's decentralized nodes
- It can only sign/act when a **Lit Action** approves it
- The Lit Action is the gatekeeper — it checks Flow's `triggered` state

So the "encryption/decryption" framing is wrong. There's nothing to encrypt. The **access condition IS the wallet**. Lit controls the PKP, and the condition is: "Is this vault triggered on Flow?"

---

## Full End-to-End Flow

### Vault Creation (Owner)
1. Owner connects Flow wallet
2. Frontend calls Lit API → creates PKP wallet
   - `GET /core/v1/create_wallet` with account API key
   - Returns `{ pkp_id, wallet_address }`
   - `wallet_address` is the recovery wallet address (safe to share publicly)
3. Frontend creates vault on Flow:
   - Calls `setup_vault_owner.cdc` transaction
   - Passes `recoveryAddress` (beneficiary's Flow address) + inactivity period
   - Contract emits `VaultCreated(owner, recoveryAddress, vaultId)` event
   - Scheduled transaction is set for inactivity period
4. Frontend uploads **Lit Action JS** to IPFS (via Pinata or web3.storage)
   - This JS checks Flow's triggered state before approving PKP access
   - Returns the IPFS CID (e.g. `QmXyz...`)
5. Frontend stores on Flow contract:
   - `setRecoveryWalletCID(vaultId, ipfsCID)` — the Lit Action CID
   - `setRecoveryWalletAddress(vaultId, pkpWalletAddress)` — the PKP address
6. Owner saves PKP wallet address to share with beneficiary (out-of-band)

### Heartbeat (Owner, periodic)
1. Owner sends heartbeat transaction
2. Contract cancels old scheduled tx, records new timestamp, schedules new tx

### Auto-Trigger (Flow, no human needed)
1. Scheduled transaction fires automatically after inactivity period
2. Handler calls public capability → `triggerVault(vaultId)` → `triggered = true`
3. No bot, no keeper — Flow does it natively (Forte feature)

### Beneficiary Claim
1. Beneficiary connects their Flow wallet
2. Frontend queries `VaultCreated` events on Flow filtered by their address
3. App shows: "You are beneficiary of X vaults" with status
4. Beneficiary clicks Claim on a triggered vault
5. Frontend calls Lit Chipotle REST API:
   - `POST /core/v1/lit_action`
   - Passes the IPFS CID (Lit Action), vaultId, beneficiary address
6. Lit Action runs on Lit nodes:
   - Fetches Flow contract state → checks `triggered == true`
   - If triggered → PKP signs → returns proof of access
   - If not triggered → rejects
7. Beneficiary gets access to the PKP wallet → controls the assets

---

## Lit Protocol Chipotle (v3) — Correct Usage

**Chipotle is REST API only. No SDK. No Datil. No Naga.**

### What Goes Where

| Item | Where it lives |
|------|---------------|
| PKP wallet address | On-chain (Flow contract field `recoveryWalletAddress`) |
| Lit Action JS file | IPFS (uploaded via Pinata) |
| IPFS CID of Lit Action | On-chain (Flow contract field `recoveryWalletCID`) |
| IPFS CID in Lit dashboard | Registered under your group's "CID hashes permitted" |
| Usage API Key | Frontend env var (`NEXT_PUBLIC_LIT_API_KEY`) |

### The Lit Action (what goes on IPFS)

The JS file must:
1. Accept `vaultId` and `flowContractAddress` as params
2. Call Flow testnet REST API to read the vault's `triggered` field
3. If `triggered == true` → call `Lit.Actions.signEcdsa` with the PKP
4. If `triggered == false` → call `Lit.Actions.setResponse({ response: "NOT_TRIGGERED" })`

This file is immutable once on IPFS. The CID is its fingerprint. If you change the code, the CID changes.

### API Endpoints Used

| Endpoint | Method | When |
|----------|--------|------|
| `/core/v1/create_wallet` | GET | Vault creation — make the PKP |
| `/core/v1/add_group` | POST | One-time setup |
| `/core/v1/lit_action` | POST | Beneficiary claim — run the action |
| `/core/v1/billing/balance` | GET | Check credits |

### Execute Lit Action (Claim Step)

```bash
POST https://api.dev.litprotocol.com/core/v1/lit_action
Headers: X-Api-Key: YOUR_USAGE_KEY
Body:
{
  "ipfs_id": "QmYourLitActionCID",
  "js_params": {
    "vaultId": "1",
    "flowContractAddress": "0xec3c1566d2b4bb6c",
    "beneficiaryAddress": "0xabc..."
  }
}
```

---

## Cadence Contract — Known Bugs

These must be fixed before deployment works correctly:

### Bug 1 — Handler borrows wrong account (Critical — auto-trigger broken)
`executeTransaction` uses `Shard.account.storage` but `VaultOwner` is in the **user's** account.

**Fix required:**
- Add a `triggerVault()` method to `VaultOwnerPublic` interface
- Publish a public capability from `VaultOwner` in setup transaction at `/public/shardVaultOwner`
- Handler borrows that public capability using `getAccount(self.owner).capabilities.borrow(...)`

### Bug 2 — `static let` invalid Cadence syntax
Contract-level constants must use `access(all) let`, not `static let`.

### Bug 3 — `create VaultOwner` missing `Shard.` prefix
In transactions: `create VaultOwner(...)` → must be `create Shard.VaultOwner(_owner: signer.address)`

### Bug 4 — `getVaultOwner()` ignores its address parameter
Always borrows from `Shard.account` regardless of which address is passed. Needs to use capabilities to borrow from the correct user account.

### Bug 5 — Missing `VaultCreated` event
Without this event, beneficiary discovery (the claim portal) cannot work.
```cadence
access(all) event VaultCreated(owner: Address, recoveryAddress: Address, vaultId: UInt64)
// Emit inside createVault()
```

### Bug 6 — Missing public capability setup
Handler cannot reach a user's vault without a published capability. Setup transaction must publish `VaultOwner` at a public path.

---

## Beneficiary Discovery — How It Works

The claim page needs to show a beneficiary all vaults assigned to their address. There is no magic on-chain lookup — you need **Flow events**.

### The Pattern
1. Contract emits `VaultCreated(owner, recoveryAddress, vaultId)` on every vault creation
2. Frontend queries Flow for all `VaultCreated` events
3. Filter: keep only events where `recoveryAddress == connectedWalletAddress`
4. For each match, fetch current vault state (triggered or not)
5. Show the list

Events are permanently stored on-chain and queryable by type. This is the standard Flow pattern for "find all things related to my address."

---

## Repo Structure Notes

- **Use `contracts/shard-vault/`** — this is the active Flow project with `flow.json`
- **`contracts/cadence/`** is an older duplicate — ignore it
- **`flow.json`** is correctly configured for testnet deployment to `ec3c1566d2b4bb6c`
- **`Counter` and `CounterTransactionHandler`** in flow.json are leftover scaffolding — not needed
- **`.pkey` file** (`shared-vault-aakash.pkey`) must exist locally to deploy — never commit it

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contracts | Flow Cadence | Vault logic + scheduled transactions |
| Programmatic Wallet | Lit Protocol Chipotle (v3) PKP | Recovery wallet nobody owns |
| Conditional Access | Lit Action (JS on IPFS) | Checks Flow triggered state |
| Storage | Storacha | Stores uploaded files, returns CID |
| Frontend | Next.js + FCL | User wallet connection |

---

## Bounty Targets

| Sponsor | Priority | Notes |
|---------|----------|-------|
| **Flow ($10k)** | Critical | Cadence + scheduled transactions (Forte) — killer feature |
| **Lit Protocol** | Critical | PKP programmatic wallet + Lit Action conditional access |
| **Storacha** | Critical | w3up-client for CID storage |
| **Fresh Code ($50k)** | High | Novel keeper-less inheritance |

---

## Critical Warnings

1. **Chipotle is REST API only** — no SDK, no Naga, no Datil
2. **Naga sunset April 1, 2026** — do not use it
3. **Recovery wallet = Lit PKP** — never generate a raw private key for this
4. **Cadence over Solidity** — judges expect Cadence
5. **VaultCreated event is required** — beneficiary portal doesn't work without it
6. **Public capability is required** — auto-trigger doesn't work without it

---

## Development Order (Remaining)

1. Fix Cadence contract bugs (Handler capability pattern + event emission)
2. Deploy to Flow testnet: `cd contracts/shard-vault && flow project deploy --network testnet`
3. Write Lit Action JS file → upload to IPFS → get CID
4. Register CID in Lit dashboard under your group
5. Wire frontend: PKP creation on vault setup, event query on claim page
6. Set env vars in `frontend/.env.local`
7. End-to-end test: create → heartbeat → trigger → claim
8. Record demo video
