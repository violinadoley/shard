# Shard - Complete Implementation Checklist

## Hackathon Submission Requirements

- [ ] Working end-to-end demo (video)
- [ ] Deployed on Flow testnet
- [x] Cadence contract using scheduled transactions
- [ ] Lit Chipotle v3 encryption working with REST API
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

### 2. Lit Protocol Integration (Chipotle v3)

**CHIPOTLE IS LIVE (March 25, 2026) - Naga is DEAD (April 1, 2026)**

- [x] REST API based - no SDK needed
- [x] Account creation via API
- [x] Usage API key creation with execute permissions
- [x] PKP (wallet) creation
- [x] Lit Action execution for key release
- [ ] **NEEDS TESTING** with actual account

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
- `ethers` v6 - Ethereum utilities (for wallet generation)
- `next` - React framework
- `react` - UI library
- `tailwindcss` - Styling
- **NO Lit SDK needed for Chipotle** - REST API only

### Environment Variables:
Create `.env.local` in frontend folder:
```env
NEXT_PUBLIC_FLOW_NETWORK=testnet
NEXT_PUBLIC_FLOW_ADDRESS=ec3c1566d2b4bb6c
NEXT_PUBLIC_LIT_API_KEY=your-usage-api-key
NEXT_PUBLIC_LIT_ACCOUNT_KEY=your-account-api-key
```

## Lit Chipotle Setup Instructions

### Step 1: Create Account
1. Go to https://dashboard.dev.litprotocol.com
2. Sign up for a new account
3. You'll receive an API key

Or via API:
```bash
curl -X POST "https://api.dev.litprotocol.com/core/v1/new_account" \
  -H "Content-Type: application/json" \
  -d '{"account_name":"Shard","account_description":"Vault recovery","email":"you@example.com"}'
```

### Step 2: Add Funds
1. Go to Dashboard: https://dashboard.dev.litprotocol.com/dapps/dashboard/
2. Click "Add Funds"
3. Pay with credit card (minimum $5)

Or via API:
```bash
# Check balance
curl "https://api.dev.litprotocol.com/core/v1/billing/balance" \
  -H "X-Api-Key: YOUR-API-KEY"
```

### Step 3: Create Usage API Key
```bash
curl -X POST "https://api.dev.litprotocol.com/core/v1/add_usage_api_key" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR-ACCOUNT-API-KEY" \
  -d '{
    "name": "Shard DApp",
    "description": "For vault recovery",
    "can_create_groups": false,
    "can_delete_groups": false,
    "can_create_pkps": false,
    "execute_in_groups": [0]
  }'
```

### Step 4: Create PKP (Wallet)
```bash
curl "https://api.dev.litprotocol.com/core/v1/create_wallet" \
  -H "X-Api-Key: YOUR-API-KEY"
```

### Step 5: Run Lit Actions
```bash
curl -X POST "https://api.dev.litprotocol.com/core/v1/lit_action" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR-USAGE-API-KEY" \
  -d '{
    "code": "async function main({ pkpId }) { return { hello: \"world\" }; }",
    "js_params": {}
  }'
```

## Sponsor Integration Points

### Flow ($10,000)
- [x] Cadence contract
- [x] Scheduled transactions (Forte feature)
- [x] VaultOwner pattern for multiple vaults
- [ ] Deep integration demo
- [ ] Clear demo of self-triggering

### Lit Protocol
- [x] REST API (Chipotle v3)
- [x] Encryption/decryption via Lit Actions
- [x] PKP wallet creation
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
│   │       ├── lit.ts            # Lit Chipotle REST API
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

1. [ ] Create Lit Chipotle account at https://dashboard.dev.litprotocol.com
2. [ ] Add funds to Lit account (minimum $5)
3. [ ] Create usage API key
4. [ ] Deploy Shard contract to testnet: `cd contracts/shard-vault && flow project deploy --network testnet`
5. [ ] Run frontend: `cd frontend && npm install && npm run dev`
6. [ ] Test vault creation flow
7. [ ] Test heartbeat (need short inactivity period for demo)
8. [ ] Test recovery wallet generation
9. [ ] Test Lit encryption
10. [ ] Test Storacha upload
11. [ ] Record demo video
12. [ ] Submit

## Critical Notes

- **Naga is DEAD (April 1, 2026)** - Use Chipotle v3 only
- **Chipotle is REST API** - No SDK, uses HTTP calls
- **Chipotle is production** - Live since March 25, 2026
- **Datil is DEAD** - Do NOT use
- **Cadence not Solidity** - Judges expect Cadence

## Hackathon Deadline

**March 31, 2026 (TODAY!)**

## Network Endpoints

- Flow Testnet REST: `https://rest-testnet.onflow.org`
- Flow Testnet Access: `access-testnet.onflow.org:9000`
- Flow EVM Testnet: `https://testnet.evm.nodes.onflow.org` (chain ID: 545)
- Lit Chipotle API: `https://api.dev.litprotocol.com/core/v1`
- Lit Dashboard: `https://dashboard.dev.litprotocol.com`
- Storacha: `https://console.storacha.network`