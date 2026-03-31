# Shard - Dead Man's Switch Wallet Recovery

**Your vault wakes up on its own if you stop checking in.**

A self-custodial inheritance system built on Flow blockchain using scheduled transactions, Lit Protocol for conditional encryption, and Storacha for decentralized storage.

## The Killer Feature

**No keepers needed.** Flow's scheduled transactions let the vault self-trigger when you're inactive. No external bots, no trusted third parties.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contracts | Flow Cadence | Vault logic + scheduled transactions (Forte) |
| Encryption | Lit Protocol v8 (Naga) | Conditional secret release |
| Storage | Storacha (w3up-client) | Encrypted blob storage |
| Frontend | Next.js + FCL | User wallet connection |

## Project Structure

```
pl-genesis/
├── contracts/
│   └── cadence/
│       ├── contracts/Shard.cdc       # Main contract
│       ├── transactions/               # Cadence transactions
│       └── scripts/                   # Read-only scripts
├── frontend/                          # Next.js app
│   └── src/
│       ├── app/                      # Pages
│       └── lib/                       # Integrations
├── canvas/                            # Architecture diagrams
└── resources/
    ├── SHARD.md                      # Main documentation
    └── CHECKLIST.md                  # Implementation checklist
```

## Quick Start

### 1. Setup Flow CLI

```bash
brew install flow-cli
flow version  # Should be 2.7.1+
```

### 2. Create Account

```bash
flow accounts create
# Fund at https://faucet.flow.com/create-account
```

### 3. Deploy Contract

```bash
cd contracts/shard-vault
flow project deploy --network testnet
```

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Key Features

- [x] Vault creation with beneficiary and inactivity period
- [x] Scheduled transaction auto-trigger (Forte feature)
- [x] Heartbeat to reset countdown
- [x] Recovery wallet generation (system creates, not user upload)
- [x] Lit Protocol encryption (access gated by triggered state)
- [x] Storacha storage for encrypted blobs
- [x] Beneficiary claim flow

## Sponsor Bounties

| Sponsor | Target |
|---------|--------|
| Flow ($10k) | Cadence + scheduled transactions |
| Lit Protocol | Conditional decryption |
| Storacha | Encrypted blob storage |
| Fresh Code ($50k) | Novel keeper-less inheritance |

## Important Notes

- **Datil is dead** - Use nagaDev + v8 SDK for Lit
- **Cadence not Solidity** - Judges expect Cadence for Flow
- **Never upload private keys** - System generates fresh recovery wallets

## Hackathon Deadline

**March 31, 2026**

## Links

- [Flow Documentation](https://docs.onflow.org)
- [Lit Protocol v8](https://developer.litprotocol.com)
- [Storacha](https://console.storacha.network)
- [PL Genesis Hackathon](https://protocol.ai/hackathons)
