# Shard - Technical Specification

## Project Name

**Shard** — Dead Man's Switch Wallet Recovery

## Problem Statement

People lose access to cryptocurrency. People die. Families cannot recover assets. Existing solutions require trusted third parties or external keepers.

## Solution

A self-custodial inheritance system where:
1. User creates a vault and deposits assets
2. User sets a recovery address and inactivity period
3. Vault automatically triggers after inactivity using Flow scheduled transactions
4. Beneficiary claims through Lit Protocol conditional decryption + Storacha blob

## Sponsor Integrations

### Flow - Cadence Contract

**Why Cadence:** Flow's scheduled transactions (Forte upgrade) allow contracts to autonomously execute at specific future times without external triggers. This is the core differentiator.

**Contract Features:**
- Vault creation with asset deposit
- Recovery address and inactivity period settings
- Scheduled transaction scheduling/cancellation on heartbeat
- Automatic trigger when scheduled transaction fires
- Beneficiary claim mechanism

**Network:** Flow Testnet
**Language:** Cadence

### Lit Protocol v8 (Naga)

**Why Lit:** Conditional decryption — access to the encrypted recovery key is gated by `contract.triggered == true`.

**SDK:** `@lit-protocol/lit-node-client` v8
**Network:** nagaDev (NOT datil — datil is dead)
**Access Condition:** On-chain contract state check

**Important:** 
- Datil (V0) shut down Feb 25, 2026
- Must use Naga network with v8 SDK
- Uses AuthSig (MetaMask wallet signature)

### Storacha

**Why Storacha:** Stores the encrypted recovery key blob with a CID returned to store on-chain.

**SDK:** `@web3-storage/w3up-client`
**Network:** Production (free tier)
**Output:** CID (content identifier)

**Important:**
- Abstracts Filecoin complexity
- Data persists on Filecoin (Storacha renews deals)
- No tokens needed, free tier sufficient

## Architecture Flow

```
1. SETUP
   User creates vault
   → Contract schedules its own check-in deadline
   → Fresh recovery wallet generated
   → Private key encrypted with Lit (condition: contract.triggered == true)
   → Encrypted blob uploaded to Storacha
   → CID stored on Flow contract

2. HEARTBEAT (periodic)
   User checks in
   → Cancels existing scheduled transaction
   → Schedules new one in future
   → Inactivity timer resets

3. AUTO-TRIGGER (if no heartbeat)
   Scheduled transaction fires automatically
   → contract.triggered = true
   → No external keeper needed

4. CLAIM
   Beneficiary connects wallet
   → Lit checks triggered == true
   → Decrypts recovery key from Storacha CID
   → Beneficiary gets access to recovery wallet
```

## File Structure

```
pl-genesis/
├── contracts/
│   ├── cadence/
│   │   ├── Shard.cdc          # Main vault contract
│   │   └── transactions/      # Cadence transactions
│   └── evm/
│       └── (Solidity if needed for EVM)
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/        # UI components
│   │   ├── lib/              # Utilities
│   │   │   ├── flow.ts       # FCL config
│   │   │   ├── lit.ts        # Lit v8 client
│   │   │   └── storacha.ts   # w3up-client
│   │   └── hooks/            # Custom hooks
│   └── package.json
├── resources/
│   ├── ARCHITECTURE.md
│   └── (additional docs)
└── docs/
    ├── PROJECT_PLAN.md
    └── SETUP_GUIDE.md
```

## Environment Variables

```env
# Flow
FLOW_NETWORK=testnet
FLOW_ADDRESS=<your-flow-testnet-address>

# Lit
LIT_NETWORK=nagaDev

# Storacha
STORACHA_EMAIL=<your-email>
```

## Security Properties

1. Recovery key never touches user browser in plaintext
2. Fresh wallet generated per vault (not user-provided)
3. Conditional decryption via Lit (on-chain state gate)
4. Decentralized storage via Storacha/Filecoin
5. Self-triggering via Flow scheduled transactions (no keepers)
6. Beneficiary must have valid Flow wallet to claim
