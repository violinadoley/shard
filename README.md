# Shard — PL Genesis Hackathon Project

Dead Man's Switch Wallet Recovery for the Protocol Labs "Frontiers of Collaboration" hackathon.

## The Problem

People lose access to cryptocurrency. People die. Families cannot recover assets. Existing solutions require trusted third parties or external keepers.

## The Solution

A **self-custodial inheritance system** where your vault wakes up on its own if you stop checking in.

- **No keepers needed** — Flow scheduled transactions self-trigger
- **No key exposure** — Fresh wallet generation, never user upload
- **Deep sponsor integration** — Using Flow's flagship Forte scheduled transactions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Flow Cadence (scheduled transactions) |
| Encryption | Lit Protocol v8 (Naga) |
| Storage | Storacha (w3up-client) |
| Frontend | Next.js + Flow FCL |

## Sponsors Targeted

- Flow ($10,000) — Cadence + scheduled transactions
- Storacha — Encrypted blob storage
- Lit Protocol — Conditional decryption
- Fresh Code ($50,000) — Novel keeper-less inheritance
- Infrastructure & Digital Rights — Wallet recovery theme

## Project Structure

```
pl-genesis/
├── contracts/cadence/   # Flow Cadence contracts
├── frontend/            # Next.js + FCL frontend
├── resources/            # Architecture, hackathon context
├── docs/                 # Setup guide, project plan
└── scripts/              # Deployment scripts
```

## Quick Start

```bash
# Install Flow CLI
brew install flow-cli

# Create testnet account
flow accounts create

# Deploy contract
cd contracts/cadence
flow project deploy --network testnet

# Run frontend
cd frontend
npm install
npm run dev
```

## Critical Notes

- **Datil is DEAD** — Use nagaDev with Lit v8 SDK
- Use **Cadence** not Solidity for Flow bounty
- Users **never upload private keys** — system generates fresh wallets

## Deadline

**March 31, 2026** — Hackathon ends today!
