# Shard - Complete Implementation Checklist

## Hackathon Submission Requirements

- [ ] Working end-to-end demo (video)
- [ ] Deployed on Flow testnet
- [ ] Cadence contract using scheduled transactions
- [ ] Lit encryption working with nagaDev
- [ ] Storacha upload returning CID
- [ ] Clear narrative: "your vault wakes up on its own"

## Core Features

### 1. Flow Cadence Contract (`contracts/cadence/Shard.cdc`)

- [x] Vault resource with all required fields (id, owner, recoveryAddress, inactivityPeriodSeconds, lastHeartbeat, triggered, recoveryWalletCID, scheduledTxID)
- [x] Scheduled transaction handler for auto-trigger
- [x] Admin resource for vault management
- [x] `createVault()` - creates vault and schedules first check-in
- [x] `heartbeat()` - cancels old tx, schedules new one
- [x] `trigger()` - called by scheduled tx when deadline passes
- [x] `setRecoveryWalletCID()` - stores encrypted key CID
- [x] `getTimeUntilTrigger()` - calculates remaining time
- [ ] Multiple vaults per account support (currently broken - fixed storage path)
- [ ] Proper scheduled tx ID tracking and cancellation

### 2. Lit Protocol Integration (`frontend/src/lib/lit.ts`)

- [x] Initialize Lit client with nagaDev network
- [x] `encryptRecoveryKey()` with access control conditions
- [x] `decryptRecoveryKey()` when condition met
- [ ] Correct access condition for Flow contract (currently using wrong ABI/chain)
- [ ] Test with actual Flow EVM contract address

### 3. Storacha Integration (`frontend/src/lib/storacha.ts`)

- [x] Initialize w3up-client
- [x] `uploadEncryptedKey()` - uploads blob, returns CID
- [x] `downloadEncryptedKey()` - retrieves blob by CID
- [ ] Email registration flow
- [ ] Space creation verification

### 4. Frontend Pages

#### Landing Page (`/`)
- [x] Wallet connection with FCL
- [x] Navigation to Create Vault, My Vaults, Claim
- [x] Feature highlights (No Keepers, Key Protection, Self-Custodial)

#### Create Vault (`/create`)
- [x] Recovery address input
- [x] Inactivity period input
- [ ] **Generate fresh recovery wallet (MISSING)**
- [ ] **Encrypt recovery key with Lit (MISSING)**
- [ ] **Upload to Storacha (MISSING)**
- [ ] **Store CID on contract (currently placeholder)**
- [ ] Display recovery wallet address to user

#### My Vault (`/vault`)
- [x] Display vault status (Active/Triggered)
- [x] Display beneficiary address
- [x] Display inactivity period
- [x] Display time until trigger (countdown)
- [x] Heartbeat button
- [ ] **Reschedule tx after heartbeat (currently not working)**
- [ ] Display recovery wallet CID
- [ ] **Display recovery wallet address to user (MISSING)**

#### Claim (`/claim`)
- [ ] Check if connected wallet is beneficiary
- [ ] Verify vault is triggered
- [ ] **Decrypt recovery key using Lit**
- [ ] **Display recovery wallet private key to beneficiary**
- [ ] Clear UX explaining what to do with key

## Technical Issues to Fix

### Critical (Must Fix)

1. **Multiple Vaults Per Account**
   - Current: Uses fixed storage path `/storage/shardVaults`
   - Fix: Use account storage with vault ID as key, or separate paths per vault

2. **Scheduled Transaction ID Tracking**
   - Current: `scheduledTxID` is never set
   - Fix: Capture and store tx ID from `manager.schedule()`

3. **Heartbeat Cancellation**
   - Current: Tries to use `vault.scheduledTxID` which is always nil
   - Fix: Store tx ID on schedule, use it on heartbeat

4. **Lit Access Condition**
   - Current: Using `functionName: "triggered"` but it's a field
   - Fix: Use proper EVM contract call condition or change to method

5. **Recovery Wallet Generation**
   - Current: Placeholder only
   - Fix: Generate fresh wallet with ethers, encrypt private key

### Important (Should Fix)

6. **Admin Owner Reference**
   - Current: `self.owner` in Admin but Admin has no owner field
   - Fix: Use `signer.address` in transaction instead

7. **Handler Vault Lookup**
   - Current: Hardcoded to single vault
   - Fix: Pass vault ID in transaction data or store per-user handler

8. **Flow EVM vs Ethereum for Lit**
   - Current: Using "ethereum" chain
   - Fix: Use Flow EVM chain (chain ID 545 for testnet)

## Sponsor Integration Points

### Flow ($10,000)
- [x] Cadence contract
- [x] Scheduled transactions (Forte feature)
- [ ] Deep integration - using Cadence-native features
- [ ] Clear demo of self-triggering

### Lit Protocol
- [x] Encryption/decryption
- [x] Access control conditions
- [ ] Using access conditions properly (fix ABI)
- [ ] Demonstrating conditional key release

### Storacha
- [x] Upload encrypted blob
- [x] Return CID
- [ ] Email verification flow
- [ ] Upload confirmation UX

## Demo Video Requirements

- [ ] Show wallet connection
- [ ] Show vault creation
- [ ] Show recovery wallet generation
- [ ] Show encrypted upload
- [ ] Show heartbeat (countdown reset)
- [ ] Show auto-trigger after inactivity
- [ ] Show beneficiary claim flow
- [ ] Voiceover explaining the killer feature (no keepers)

## Submission Checklist

- [ ] Contract deployed to Flow testnet
- [ ] Frontend deployed (Vercel/Netlify)
- [ ] Demo video recorded and uploaded
- [ ] GitHub repo cleaned and public
- [ ] README updated with instructions
- [ ] Contract address shared in submission

## File Structure

```
pl-genesis/
├── contracts/
│   └── cadence/
│       ├── contracts/
│       │   └── Shard.cdc          # Main contract (needs fixes)
│       ├── transactions/
│       │   ├── setup_vault.cdc
│       │   ├── heartbeat.cdc
│       │   └── set_recovery_cid.cdc
│       └── scripts/
│           ├── get_vault.cdc
│           └── is_triggered.cdc
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing
│   │   │   ├── create/page.tsx   # Create vault (needs recovery gen)
│   │   │   ├── vault/page.tsx    # My vault
│   │   │   └── claim/page.tsx    # Claim recovery
│   │   └── lib/
│   │       ├── flow.ts           # FCL config
│   │       ├── wallet.ts         # Wallet connection
│   │       ├── lit.ts            # Lit integration (needs fix)
│   │       ├── storacha.ts       # Storacha integration
│   │       └── vault.ts          # Vault service
│   └── package.json
├── canvas/
│   ├── shard-architecture.html
│   └── shard-swimlane.html
├── resources/
│   ├── SHARD.md                  # Main doc
│   └── CHECKLIST.md              # This file
└── README.md
```

## Priority Order for Remaining Work

1. Fix Cadence contract (multiple vaults, tx ID tracking)
2. Fix Lit access condition (correct ABI)
3. Add recovery wallet generation to frontend
4. Wire up complete create vault flow
5. Test end-to-end on testnet
6. Record demo video
7. Submit
