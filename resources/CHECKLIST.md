# Shard - Complete Implementation Checklist

## Hackathon Submission Requirements

- [ ] Working end-to-end demo (video)
- [ ] Deployed on Flow testnet
- [x] Cadence contract using scheduled transactions
- [ ] Lit encryption working with nagaDev
- [ ] Storacha upload returning CID
- [x] Clear narrative: "your vault wakes up on its own"

## Core Features

### 1. Flow Cadence Contract

- [x] VaultOwner resource (supports multiple vaults per account)
- [x] Vault resource with all required fields
- [x] Scheduled transaction handler for auto-trigger
- [x] Admin functionality through VaultOwner
- [x] `createVault()` - creates vault and schedules first check-in
- [x] `heartbeat()` - cancels old tx, schedules new one
- [x] `trigger()` - called by scheduled tx when deadline passes
- [x] `setRecoveryWalletCID()` - stores encrypted key CID
- [x] `getTimeUntilTrigger()` - calculates remaining time
- [x] Proper scheduled tx ID tracking and cancellation

### 2. Lit Protocol Integration

- [x] Initialize Lit client with nagaDev network
- [x] `encryptRecoveryKey()` with EVM access control conditions
- [x] `decryptRecoveryKey()` when condition met
- [x] Correct EVM contract condition structure
- [ ] **NEEDS TESTING** with actual Flow EVM contract

### 3. Storacha Integration

- [x] Initialize w3up-client
- [x] `uploadEncryptedKey()` - uploads blob, returns CID
- [x] `downloadEncryptedKey()` - retrieves blob by CID
- [ ] Email registration flow (can use free tier without)
- [ ] Upload confirmation UX

### 4. Frontend Pages

#### Landing Page (`/`)
- [x] Wallet connection with FCL
- [x] Navigation to Create Vault, My Vaults, Claim
- [x] Feature highlights

#### Create Vault (`/create`)
- [x] Recovery address input
- [x] Inactivity period input
- [ ] **Recovery wallet generation (needs ethers wallet)**
- [ ] **Encrypt recovery key with Lit (wired but untested)**
- [ ] **Upload to Storacha (wired but untested)**
- [ ] **Store CID on contract (needs vault ID extraction)**
- [ ] Display recovery wallet address to user

#### My Vault (`/vault`)
- [x] Display vault status (Active/Triggered)
- [x] Display beneficiary address
- [x] Display inactivity period
- [x] Display time until trigger (countdown)
- [x] Heartbeat button
- [x] Multiple vault support
- [x] Auto-refresh every 30 seconds

#### Claim (`/claim`)
- [x] Check if connected wallet is beneficiary
- [x] Verify vault is triggered
- [ ] **Decrypt recovery key using Lit (wired but untested)**
- [ ] **Display recovery wallet private key to beneficiary**
- [ ] Clear UX explaining what to do with key

## Installation & Setup

### DONE - Dependencies installed:
```bash
cd frontend
npm install
```

### Dependencies:
- `@onflow/fcl` - Flow wallet connection
- `@onflow/types` - Flow type definitions
- `@lit-protocol/lit-node-client` v8 - Lit Protocol encryption
- `@web3-storage/w3up-client` - Storacha storage
- `ethers` v6 - Ethereum utilities (for wallet generation)
- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling

### Environment Variables:
Create `.env.local` in frontend folder:
```env
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ADDRESS=ec3c1566d2b4bb6c
NEXT_PUBLIC_LIT_NETWORK=nagaDev
```

## Sponsor Integration Points

### Flow ($10,000)
- [x] Cadence contract
- [x] Scheduled transactions (Forte feature)
- [x] VaultOwner pattern for multiple vaults
- [ ] Deep integration demo
- [ ] Clear demo of self-triggering

### Lit Protocol
- [x] Encryption/decryption
- [x] EVM access control conditions
- [ ] Using access conditions properly with Flow EVM
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
- [ ] Frontend runs locally (npm run dev)
- [ ] Demo video recorded and uploaded
- [ ] GitHub repo cleaned and public
- [ ] README updated with instructions
- [ ] Contract address shared in submission

## File Structure

```
pl-genesis/
├── contracts/
│   └── shard-vault/              # Flow project (READY TO DEPLOY)
│       ├── cadence/
│       │   ├── contracts/Shard.cdc
│       │   ├── transactions/
│       │   └── scripts/
│       └── flow.json
├── frontend/                       # Next.js app (NEEDS npm install)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing
│   │   │   ├── create/page.tsx   # Create vault
│   │   │   ├── vault/page.tsx    # My vault
│   │   │   └── claim/page.tsx    # Claim recovery
│   │   └── lib/
│   │       ├── flow.ts           # FCL config
│   │       ├── wallet.ts         # Wallet connection
│   │       ├── lit.ts            # Lit v8 integration
│   │       ├── storacha.ts       # Storacha integration
│   │       └── vault.ts          # Vault service
│   ├── .env.example
│   └── package.json
├── canvas/                        # Diagrams
├── resources/
│   ├── SHARD.md
│   └── CHECKLIST.md
└── README.md
```

## Priority Order for Remaining Work

1. [ ] Deploy Shard contract to testnet: `cd contracts/shard-vault && flow project deploy --network testnet`
2. [ ] Run frontend: `cd frontend && npm install && npm run dev`
3. [ ] Test vault creation flow
4. [ ] Test heartbeat (need short inactivity period for demo)
5. [ ] Test recovery wallet generation
6. [ ] Test Lit encryption (need EVM view contract)
7. [ ] Test Storacha upload
8. [ ] Record demo video
9. [ ] Submit

## Critical Notes

- **Datil is DEAD** - Use nagaDev + v8 SDK only
- **Lit v8 API changed** - Uses `client.encrypt()` not standalone functions
- **Flow EVM for Lit** - Lit checks EVM contracts, need view function on Flow EVM
- **Cadence not Solidity** - Judges expect Cadence

## Hackathon Deadline

**March 31, 2026 (TODAY!)**

## Network Endpoints

- Flow Testnet REST: `https://rest-testnet.onflow.org`
- Flow Testnet Access: `access-testnet.onflow.org:9000`
- Flow EVM Testnet: `https://testnet.evm.nodes.onflow.org` (chain ID: 545)
- Lit NagaDev: `nagaDev` (free, no tokens)
- Storacha: `https://console.storacha.network`