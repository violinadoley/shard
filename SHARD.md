# Shard — Dead Man's Switch Wallet Recovery

**PL Genesis Hackathon Project | Deadline: March 31, 2026**

## The Problem

People lose access to crypto. People die. Families cannot recover assets. Existing solutions require external keepers or trust in third parties.

## The Solution

A self-custodial vault that **wakes up on its own** if you stop checking in.

- No keepers — Flow scheduled transactions self-trigger
- No key exposure — Fresh wallet generation, never user upload
- Deep sponsor integration — Using Flow's flagship Forte feature

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Smart Contracts | Flow Cadence | Vault logic + scheduled transactions |
| Encryption | Lit Protocol v8 (Naga) | Conditional secret release |
| Storage | Storacha | Encrypted key blob with CID |
| Frontend | Next.js + FCL | User wallet connection |

## Bounty Targets

| Sponsor | Priority | Notes |
|---------|----------|-------|
| **Flow ($10k)** | Critical | Cadence + scheduled transactions (Forte) |
| **Storacha** | Critical | w3up-client for encrypted blob |
| **Lit Protocol** | Critical | v8 Naga for conditional decrypt |
| **Fresh Code ($50k)** | High | Novel keeper-less inheritance |
| **Infrastructure & Digital Rights** | Medium | Wallet recovery theme |

## Flow: Setup

```bash
brew install flow-cli
flow init
flow accounts create
```

**Faucet:** https://faucet.flow.com/create-account → 100k testnet FLOW

**Networks:**
- Cadence: Flow testnet
- EVM (optional): https://testnet.evm.nodes.onflow.org, Chain ID: 545

## Lit: Setup

```bash
npm i @lit-protocol/lit-node-client
```

**⚠️ CRITICAL:** Datil (V0) shut down Feb 25, 2026. Use `nagaDev` with v8 SDK only.

- Network: `nagaDev` (free, no tokens)
- Wallet: MetaMask (signs AuthSig)

## Storacha: Setup

```bash
npm i @web3-storage/w3up-client
```

Sign up: https://console.storacha.network (free tier)

## Frontend: Setup

```bash
npm i @onflow/fcl @onflow/react-sdk
```

Users connect with Flow Wallet / Blocto / Lilico.

## Contract Flow

1. **Setup:** User creates vault → sets recovery address + inactivity → system generates fresh recovery wallet → encrypts key with Lit → uploads to Storacha → stores CID on contract → contract schedules its own check-in deadline

2. **Heartbeat:** User checks in → cancels existing scheduled tx → schedules new one

3. **Auto-trigger:** Scheduled tx fires automatically → `triggered = true`

4. **Claim:** Beneficiary connects → Lit checks `triggered == true` → decrypts key → beneficiary claims

## Critical Warnings

1. **Datil is DEAD** — use nagaDev + v8 SDK
2. **Cadence over Solidity** — judges expect Cadence
3. **Never upload user private keys** — system generates fresh wallets
4. **No Zama** — FHE is wrong tool for conditional key release

## Development Order

1. Flow CLI + testnet account + faucet
2. Storacha account + w3up-client test
3. Lit v8 + nagaDev connection
4. Cadence contract with scheduled transactions
5. Frontend with FCL wallet connection
6. End-to-end test: setup → heartbeat → trigger → claim
