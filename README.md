# Shard - Dead Man's Switch Wallet Recovery

Hi

**Your vault wakes up on its own if you stop checking in.**

A self-custodial inheritance system built on Flow blockchain using scheduled transactions, Lit Protocol for programmatic PKP wallets + conditional access, and Storacha for decentralized storage.

## The Killer Feature

**No keepers needed.** Flow's scheduled transactions let the vault self-trigger when you're inactive. No external bots, no trusted third parties. The recovery wallet is a Lit PKP — nobody holds its private key, only the Lit Action condition controls it.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contracts | Flow Cadence | Vault logic + scheduled transactions (Forte) |
| Programmatic Wallet | Lit Protocol Chipotle (v3) PKP | Recovery wallet nobody owns — access gated by Flow triggered state |
| Conditional Access | Lit Action (JS on IPFS) | Checks Flow contract triggered state before releasing access |
| Storage | Storacha (w3up-client) | Stores Lit Action CID reference |
| Frontend | Next.js + FCL | User wallet connection |

## Architecture Overview

```
Owner creates vault
  → Lit API creates PKP wallet (no private key, nobody owns it)
  → PKP address stored on Flow contract (public, safe)
  → Lit Action JS uploaded to IPFS (checks Flow triggered state)
  → IPFS CID stored on Flow contract
  → Flow emits VaultCreated event (enables beneficiary discovery)
  → Scheduled transaction starts countdown

Owner sends heartbeats → resets countdown

Owner stops checking in → Flow auto-triggers → triggered = true

Beneficiary connects wallet
  → Queries VaultCreated events filtered by their address
  → Sees all vaults assigned to them
  → Calls Lit with the IPFS CID
  → Lit Action checks Flow: triggered == true → grants PKP access
  → Beneficiary controls the PKP wallet → has the assets
```

## Project Structure

```
pl_project/
├── contracts/
│   └── shard-vault/                  # Flow project (deploy this one)
│       ├── cadence/
│       │   ├── contracts/Shard.cdc   # Main contract
│       │   ├── transactions/         # Cadence transactions
│       │   └── scripts/              # Read-only scripts
│       └── flow.json                 # Flow project config
├── frontend/                         # Next.js app
│   └── src/
│       ├── app/                      # Pages (create, vault, claim)
│       └── lib/                      # Integrations (flow, lit, storacha, vault)
├── canvas/                           # Architecture diagrams
└── resources/
    ├── SHARD.md                      # Full architecture documentation
    └── CHECKLIST.md                  # Implementation checklist
```

> Note: `contracts/cadence/` is an older duplicate. Use `contracts/shard-vault/` for everything.

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
- [x] Scheduled transaction auto-trigger (Forte feature — no bots needed)
- [x] Heartbeat to reset countdown
- [x] Recovery wallet is a Lit PKP (no private key ever exists)
- [x] Lit Action on IPFS gates access using Flow triggered state
- [x] Beneficiary discovery via Flow VaultCreated events
- [x] Storacha stores Lit Action CID reference
- [x] Beneficiary claim flow via Lit Chipotle REST API

## Known Contract Bugs (Needs Fix Before Deploy)

1. **Handler borrows wrong account** — `executeTransaction` uses `Shard.account` but VaultOwner is in the user's account. Fix: publish a public capability from VaultOwner and borrow that instead.
2. **`static let` is invalid Cadence** — use `access(all) let` at contract level.
3. **`create VaultOwner` missing prefix** — must be `create Shard.VaultOwner(...)` in transactions.
4. **`getVaultOwner()` ignores its parameter** — always borrows from contract account; never finds user vaults.
5. **Missing `VaultCreated` event** — beneficiary discovery depends on this event being emitted.
6. **Missing public capability publish** — VaultOwner must publish a public-facing capability for the Handler to trigger it cross-account.

## Sponsor Bounties

| Sponsor | Target |
|---------|--------|
| Flow ($10k) | Cadence + scheduled transactions (Forte) |
| Lit Protocol | PKP programmatic wallet + conditional Lit Action |
| Storacha | CID storage for Lit Action reference |
| Fresh Code ($50k) | Novel keeper-less inheritance |

## Important Notes

- **Chipotle (v3) is live** — REST API only, no SDK needed
- **Naga sunset April 1, 2026** — do NOT use Naga or Datil
- **Cadence not Solidity** — judges expect Cadence for Flow
- **Recovery wallet = Lit PKP** — no private key is ever generated or stored
- **Beneficiary discovery = Flow events** — query `VaultCreated` events filtered by address

## Links

- [Flow Documentation](https://docs.onflow.org)
- [Lit Protocol Chipotle](https://developer.litprotocol.com)
- [Storacha](https://console.storacha.network)
- [PL Genesis Hackathon](https://protocol.ai/hackathons)
