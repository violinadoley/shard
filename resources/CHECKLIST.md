# Shard - Implementation Checklist

---

## Cadence Contract Fixes (Must Fix Before Deploy)

- [ ] Fix `static let` → `access(all) let` for storage paths
- [ ] Fix `create VaultOwner` → `create Shard.VaultOwner(_owner: signer.address)` in transactions
- [ ] Add `triggerVault()` to `VaultOwnerPublic` interface
- [ ] Fix `Handler.executeTransaction` to borrow public capability instead of `Shard.account`
- [ ] Fix `getVaultOwner()` to use capabilities instead of ignoring the address param
- [ ] Add `VaultCreated(owner, recoveryAddress, vaultId)` event + emit it in `createVault()`
- [ ] Add `recoveryWalletAddress` field to Vault resource (stores PKP address)
- [ ] Add `setRecoveryWalletAddress()` function to Vault resource
- [ ] Setup transaction must publish VaultOwner public capability at `/public/shardVaultOwner`
- [ ] Remove leftover `Counter` and `CounterTransactionHandler` from flow.json deployments

---

## Lit Protocol Integration (Chipotle v3)

- [x] Account created at dashboard.dev.litprotocol.com
- [x] API key saved
- [ ] Funds added (minimum $5 via Stripe)
- [x] Usage API key created
- [x] PKP wallet (AMW) created
- [x] Group (my-app) created with PKP assigned
- [ ] Write Lit Action JS file that:
  - [ ] Accepts `vaultId` and `flowContractAddress` as `jsParams`
  - [ ] Calls Flow testnet REST API to check `triggered` field
  - [ ] If triggered → calls `Lit.Actions.signEcdsa` with PKP
  - [ ] If not triggered → returns `NOT_TRIGGERED` response
- [ ] Upload Lit Action JS to IPFS (Pinata) → save the CID
- [ ] Register the IPFS CID in Lit dashboard under group's "CID hashes permitted"
- [ ] Replace `ethers.Wallet.createRandom()` in vault.ts with Lit PKP creation API call
- [ ] Remove raw private key storage from vault.ts (it should never be generated)

---

## Flow Integration

- [ ] Deploy Shard contract to testnet: `cd contracts/shard-vault && flow project deploy --network testnet`
- [ ] Verify `shared-vault-aakash.pkey` exists locally
- [ ] Confirm contract address matches `ec3c1566d2b4bb6c` in frontend/src/lib/flow.ts

---

## Storacha Integration

- [x] w3up-client installed
- [x] `uploadEncryptedKey()` function exists
- [ ] Fix `downloadEncryptedKey()` — `capability.store.get` returns metadata not file content; use HTTP gateway fetch instead
- [ ] Register Storacha space (email verification)
- [ ] Test upload returns a valid CID

---

## Frontend Pages

### Create Vault (`/create`)
- [x] Recovery address input
- [x] Inactivity period input
- [x] Flow transaction wired
- [ ] Replace ethers wallet generation with Lit PKP creation
- [ ] Extract vault ID from Flow transaction events (not hardcoded `1`)
- [ ] Store PKP address on contract (`setRecoveryWalletAddress`)
- [ ] Store IPFS CID on contract (`setRecoveryWalletCID`)
- [ ] Display PKP wallet address to user (safe to share publicly)

### My Vault (`/vault`)
- [x] Display vault status
- [x] Heartbeat button
- [x] Countdown timer
- [x] Auto-refresh every 30s

### Claim (`/claim`)
- [ ] Query Flow `VaultCreated` events filtered by connected wallet address
- [ ] Display list of vaults where user is beneficiary
- [ ] On claim: call Lit REST API with IPFS CID + vaultId
- [ ] Handle Lit response: show success or "vault not triggered yet"
- [ ] Remove hardcoded `"RECOVERY_KEY_WILL_APPEAR_HERE"` placeholder

---

## Environment Variables

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ADDRESS=ec3c1566d2b4bb6c
NEXT_PUBLIC_LIT_API_KEY=your-usage-api-key
NEXT_PUBLIC_LIT_ACCOUNT_KEY=your-account-api-key
```

---

## Demo Video Checklist

- [ ] Show wallet connection
- [ ] Show vault creation → PKP wallet address displayed
- [ ] Show heartbeat (countdown resets)
- [ ] Show auto-trigger (use short inactivity period for demo, e.g. 1 minute)
- [ ] Show beneficiary portal → vaults appear after connecting wallet
- [ ] Show claim flow → Lit Action runs → access granted
- [ ] Voiceover: "No keepers. Flow handles the trigger. Lit handles the access. Nobody holds the key."

---

## Submission Checklist

- [ ] Contract deployed to Flow testnet
- [ ] Frontend runs: `cd frontend && npm install && npm run dev`
- [ ] Demo video recorded and uploaded
- [ ] GitHub repo is public
- [ ] README updated with contract address and setup instructions
- [ ] Contract address submitted: `ec3c1566d2b4bb6c`

---

## Architecture Summary (Quick Reference)

```
Recovery wallet = Lit PKP (no private key ever exists)
Auto-trigger = Flow scheduled transaction (Forte)
Access gate = Lit Action JS on IPFS (checks Flow triggered state)
Beneficiary discovery = Flow VaultCreated events
Storage = Storacha (for any blobs/references)
```

## Network Endpoints

- Flow Testnet REST: `https://rest-testnet.onflow.org`
- Flow Testnet Access: `access-testnet.onflow.org:9000`
- Lit Chipotle API: `https://api.dev.litprotocol.com/core/v1`
- Lit Dashboard: `https://dashboard.dev.litprotocol.com`
- Storacha: `https://console.storacha.network`
