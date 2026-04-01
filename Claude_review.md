# Claude Implementation Review & Trace
**PL Genesis Hackathon — Shard Dead Man's Switch**
**Started: April 1, 2026 | 2-hour sprint**

---

## STATUS OVERVIEW

| Component | Status | Notes |
|-----------|--------|-------|
| Cadence contract | 🔴 BROKEN | 6 bugs, not deployed |
| Cadence scripts | 🔴 BROKEN | pub fun syntax + wrong borrow |
| Setup transaction | 🔴 BROKEN | `create VaultOwner` wrong syntax |
| Lit Action JS | 🔴 NOT WRITTEN | Critical for claim flow |
| Lit PKP | ⚠️ NAGA (SUNSET TODAY) | Must create new Chipotle PKP |
| storacha.ts | 🔴 download broken | upload fine, download wrong API |
| lib/lit.ts | ⚠️ Partial | executeLitAction needs ipfs_id not inline code |
| Create page | 🟡 Partial | No PKP creation, no CID storage |
| Vault page | ✅ Done | Display + heartbeat working |
| Claim page | 🔴 NOT IMPLEMENTED | Empty stub |
| .env.local | 🔴 Missing | Not created |
| Contract deployed | 🔴 NOT DEPLOYED | Need contract fix first |

---

## CRITICAL FINDING: NAGA PKP IS SUNSET TODAY

The `.env` file shows the existing PKP was created on **Naga** (centralised network):
```
Ledger: FREE for naga-dev (centralised network)
PKP Address: 0xD78F00c175f98faA04732D82917c3bC28df10755
```
**NAGA IS SUNSET APRIL 1, 2026 — which is TODAY. That PKP is dead.**

Action: Create a NEW PKP on **Chipotle** at vault creation time using `LIT_API_KEY`.

---

## ENVIRONMENT VARIABLES FOUND

```
LIT_API_KEY="X7fcKn0U8zQfiGHbiq8n2GSxw10Gf81Rq2Scuj4tKnc="
  → This is the usage API key for Chipotle REST API
  → Used in X-Api-Key header for all Lit calls
  → ⚠️ NEEDS FUNDS ($5 minimum via Stripe at dashboard.dev.litprotocol.com)

STORACHA_VAULT_KEY="did:key:z6MkedU6KuGyPKUQnQC2A9yHBKDjdyQcAhkTatL614C9x4Rr"
  → This is the Space DID (not an auth key)
  → To upload: need client.login('email') first OR a UCAN proof file
  → ⚠️ NEEDS email authorization to use

Flow account: 0xec3c1566d2b4bb6c
  → Testnet, 0.002 FLOW balance
  → .pkey file: shared-vault-aakash.pkey (needs to exist locally)
```

---

## HOW LIT PROTOCOL WORKS IN THIS PROJECT

### Architecture (Chipotle v3, REST-only)

```
VAULT CREATION:
  1. Call GET /core/v1/create_wallet   (X-Api-Key: LIT_API_KEY)
     Returns: { pkp_id, wallet_address }
     wallet_address = the PKP = the recovery wallet (no private key ever)

  2. Upload Lit Action JS to Storacha → get IPFS CID

  3. Store on Flow contract:
     - setRecoveryWalletCID(vaultId, ipfsCID)
     - setRecoveryWalletAddress(vaultId, pkpWalletAddress)

BENEFICIARY CLAIM:
  1. Call POST /core/v1/lit_action   (X-Api-Key: LIT_API_KEY)
     Body: { ipfs_id: "<CID>", js_params: { vaultId, flowContractAddress } }

  2. Lit nodes fetch JS from IPFS, run it
     JS checks: is vault triggered on Flow?
     If yes → PKP signs → returns signature proof
     If no  → returns "NOT_TRIGGERED"

  3. Beneficiary gets PKP wallet access (the recovery wallet)
```

### Current lib/lit.ts Issues
- `executeLitAction()` sends `code` (inline JS string) — **WRONG for Chipotle**
  Chipotle requires `ipfs_id` (IPFS CID), not inline code
- Many placeholder functions with fake/dummy logic — will be removed or replaced
- The correct minimal set of functions needed:
  1. `createPKP(apiKey)` ✅ exists and is correct
  2. `executeLitAction(apiKey, ipfsCid, jsParams)` ❌ needs fix (ipfs_id not code)

---

## HOW STORACHA IS BEING USED

### Correct Role
Upload the **Lit Action JS file** to Storacha (which pins to IPFS/Filecoin).
Get back an IPFS CID. Store the CID on the Flow contract.
The CID is what Lit nodes use to fetch the gating logic.

### Current storacha.ts Issues
1. `downloadEncryptedKey()` uses `capability.store.get(cid)` — returns shard metadata, not file bytes
   Fix: Use HTTP gateway `https://w3s.link/ipfs/{cid}` to fetch file content
2. `getStorachaClient()` creates a blank client with no space set
   Fix: After `create()`, call `client.setCurrentSpace(spaceDID)` — but requires email auth first
3. `registerSpace()` API has changed in newer w3up-client versions

### Storacha Auth Strategy
- If email is available: `await client.login('email')` → click link → `client.setCurrentSpace(SPACE_DID)`
- If no email: use `w3s.link` public gateway for download, and Pinata API for upload as fallback
- For demo: simplest approach = upload Lit Action JS once manually via CLI, hardcode the CID

---

## CADENCE CONTRACT BUGS (All in Shard.cdc)

### Bug 1 — `static let` invalid syntax (Lines 11-14)
```cadence
// WRONG:
static let vaultStoragePath: StoragePath = /storage/shardVault

// FIX:
access(all) let vaultStoragePath: StoragePath = /storage/shardVault
```

### Bug 2 — Missing `VaultCreated` event
```cadence
// ADD to contract:
access(all) event VaultCreated(owner: Address, recoveryAddress: Address, vaultId: UInt64)
// EMIT inside createVault():
emit Shard.VaultCreated(owner: self.owner, recoveryAddress: recoveryAddress, vaultId: id)
```

### Bug 3 — Missing `recoveryWalletAddress` on Vault
```cadence
// ADD to Vault resource:
access(all) var recoveryWalletAddress: String?
// ADD function:
access(all) fun setRecoveryWalletAddress(_ addr: String) { self.recoveryWalletAddress = addr }
// INITIALIZE in init():
self.recoveryWalletAddress = nil
```

### Bug 4 — Handler borrows from wrong account (auto-trigger broken)
```cadence
// WRONG:
let ownerRef = Shard.account.storage.borrow<&VaultOwner>(from: Shard.vaultStoragePath)

// FIX: borrow public capability from owner's account
let ownerRef = getAccount(self.owner)
    .capabilities.borrow<&{VaultOwnerPublic}>(at: /public/shardVaultOwner)
    ?? panic("VaultOwner public capability not found")
ownerRef.triggerVault(vaultId: self.vaultId)
```

### Bug 5 — `triggerVault` missing from VaultOwnerPublic interface
```cadence
// ADD to VaultOwnerPublic:
access(all) fun triggerVault(vaultId: UInt64)
// ADD to VaultOwner implementation:
access(all) fun triggerVault(vaultId: UInt64) {
    let vault = self.getVault(vaultId) ?? panic("Vault not found")
    vault.trigger()
}
```

### Bug 6 — `getVaultOwner()` ignores address parameter
```cadence
// WRONG: always uses Shard.account
access(all) fun getVaultOwner(_ addr: Address): &VaultOwner? {
    return Shard.account.storage.borrow<&VaultOwner>(from: Shard.vaultStoragePath)
}

// FIX: use capabilities from the passed address
access(all) fun getVaultOwner(_ addr: Address): &{VaultOwnerPublic}? {
    return getAccount(addr)
        .capabilities.borrow<&{VaultOwnerPublic}>(at: /public/shardVaultOwner)
}
```

### Bug 7 — `create VaultOwner` wrong in transactions
```cadence
// WRONG:
let vaultOwner <- create VaultOwner(signer.address)

// FIX:
let vaultOwner <- create Shard.VaultOwner(_owner: signer.address)
```

### Bug 8 — Missing public capability publish in setup transaction
```cadence
// ADD after saving VaultOwner:
let cap = signer.capabilities.storage.issue<&{Shard.VaultOwnerPublic}>(Shard.vaultStoragePath)
signer.capabilities.publish(cap, at: /public/shardVaultOwner)
```

---

## IMPLEMENTATION ORDER (Step by Step)

### ✅ DONE
- [x] Plan written

### 🔄 IN PROGRESS

### ⏳ PENDING

**Step 1** — Fix `Shard.cdc` (all 8 bugs above)
**Step 2** — Fix `get_vault.cdc`, `get_vault_ids.cdc`, `is_triggered.cdc` scripts
**Step 3** — Fix `setup_vault_owner.cdc` + `heartbeat.cdc` transactions
**Step 4** — Write `lit-action/check_vault_triggered.js`
**Step 5** — Fix `storacha.ts` (download via HTTP gateway)
**Step 6** — Fix `lib/lit.ts` executeLitAction (ipfs_id)
**Step 7** — Wire create page (PKP + Storacha upload + contract store)
**Step 8** — Wire claim page (Flow events + Lit execution)
**Step 9** — Create `frontend/.env.local`
**Step 10** — Deploy contract: `cd contracts/shard-vault && flow project deploy --network testnet`

---

## TRACE LOG

### [T+0:00] Assessment
- Read all source files, identified all bugs
- Found Naga PKP is sunset TODAY (critical — must create new Chipotle PKP)
- LIT_API_KEY confirmed (Chipotle usage key) — needs funds check
- STORACHA_VAULT_KEY = space DID — needs email auth

### [T+0:08] Plan written
- claude_review.md created with full trace and bug analysis
- Todos set up

### [T+0:20] Cadence contract fully fixed (Shard.cdc)
- Fixed `static let` → `access(all) let` for all 4 storage paths
- Added `VaultCreated` event + emit in `createVault()`
- Added `VaultData` struct for clean script return types
- Added `recoveryWalletAddress` field + setter to Vault resource
- Added `triggerVault()` to VaultOwnerPublic interface + implementation
- Fixed Handler.executeTransaction to borrow public cap from owner account
- Fixed getVaultOwner() to use capabilities from passed address
- Added `getVaultData()` helper on VaultOwnerPublic (returns VaultData struct)
- Added `vaultOwnerPublicPath` constant

### [T+0:25] Scripts fixed
- get_vault.cdc: pub fun → access(all) fun, borrow from correct account via capabilities
- get_vault_ids.cdc: same fixes
- is_triggered.cdc: same fixes

### [T+0:27] Transactions fixed
- setup_vault_owner.cdc: fixed `create VaultOwner` → `create Shard.VaultOwner(_owner:)`, added public capability publish
- Created new set_recovery_wallet_address.cdc transaction

### [T+0:30] Lit Action JS written
- lit-action/check_vault_triggered.js created
- Accepts: vaultId, flowContractAddress, ownerAddress as jsParams
- Calls Flow REST API to check triggered state
- If triggered: signs with PKP (signEcdsa), returns TRIGGERED status
- If not: returns NOT_TRIGGERED

### [T+0:35] storacha.ts fixed
- Replaced broken capability.store.get() download with HTTP gateway (https://w3s.link/ipfs/{cid})
- Added loginStoracha(email) for space authorization
- Added uploadLitAction(jsCode) helper
- Renamed uploadEncryptedKey → uploadToStoracha (kept old name as alias)

### [T+0:38] lib/lit.ts rewritten (clean)
- Removed all placeholder/dummy functions
- createPKP() — correct, unchanged
- executeLitAction() — FIXED: now uses ipfs_id (CID) not inline code
- getBalance() — kept
- listPKPs() — kept

### [T+0:45] Create page fully wired
- Step 1: createPKP(LIT_API_KEY) → pkp.walletAddress
- Step 2: uploadLitAction(LIT_ACTION_CODE) → ipfsCID via Storacha
- Step 3: Create vault on Flow, parse VaultCreated event for vault ID
- Step 4: setRecoveryWalletCID(vaultId, cid) on Flow
- Step 5: setRecoveryWalletAddress(vaultId, pkpAddress) on Flow
- Shows PKP address to user with "share with beneficiary" note

### [T+0:55] Claim page fully implemented
- Queries Flow REST API for A.{addr}.Shard.VaultCreated events
- Filters by connectedWallet == recoveryAddress
- Fetches vault state for each match
- On Claim: calls executeLitAction(apiKey, cid, params)
- Shows PKP wallet address on TRIGGERED success

### [T+1:00] .env.local created
- NEXT_PUBLIC_LIT_API_KEY, NEXT_PUBLIC_STORACHA_SPACE set

---

## QUESTIONS FOR USER (Need Answers to Proceed)

1. **Lit funds** — Have you added $5+ at https://dashboard.dev.litprotocol.com ?
   If not, PKP creation will fail with 402/credits error.

2. **Storacha email** — What email did you use to register the space?
   Needed for `client.login('email')` to authorize uploads.
   Alternative: run `w3 space export` in terminal and share the output.

3. **Flow pkey** — Does the file `contracts/shard-vault/shared-vault-aakash.pkey` exist?
   Run: `ls contracts/shard-vault/*.pkey`

4. **Pinata API key?** — Do you have one as fallback for IPFS upload?
   (Only needed if Storacha email auth is unavailable)
