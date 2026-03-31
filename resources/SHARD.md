# Shard — Dead Man's Switch Wallet Recovery

**PL Genesis Hackathon Project | Deadline: March 31, 2026**

## The Problem

People lose access to crypto. People die. Families cannot recover assets. Existing solutions require external keepers or trust in third parties.

## The Solution

A self-custodial vault that **wakes up on its own** if you stop checking in.

- No keepers — Flow scheduled transactions self-trigger
- No key exposure — Fresh wallet generation, never user upload
- Deep sponsor integration — Using Flow's flagship Forte feature

## The Delivery Problem (Critical Insight)

**The vault can auto-trigger, but how does the beneficiary know?**

A dead man's switch is USELESS if the beneficiary doesn't know:
1. A vault exists with their name on it
2. What to do when it triggers
3. Where to go to claim

### Our Solution: Beneficiary Portal + Discovery

**1. Beneficiary Portal** (Key Feature)
A page where ANYONE connects their wallet and instantly sees:
- "You are a beneficiary of X vaults"
- List of claimable vaults with status
- One-click claim flow
- No need to remember app URL or instructions

**2. Vault Linking by Address**
The contract stores `recoveryAddress` — anyone who owns that address can:
1. Visit the app
2. Connect wallet
3. See all vaults where they are the beneficiary
4. Claim triggered vaults

**3. Shareable Vault Card**
During vault creation, generate a shareable card with:
- Recovery wallet address (public, safe to share)
- QR code linking to `/claim`
- Instructions for beneficiary
- Can be printed, stored in will, safe deposit box

**4. The Honest Truth**
Blockchain CANNOT solve the "delivery" problem completely. The beneficiary needs SOME out-of-band mechanism:
- A will naming the vault address
- A safe deposit box with recovery instructions
- An email to the beneficiary explaining what to do

Our app provides the Beneficiary Portal as the on-chain discovery mechanism, but users must still inform their beneficiaries through traditional means.

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

## Contract Flow

1. **Setup:** User creates vault → sets recovery address + inactivity → system generates fresh recovery wallet → encrypts key with Lit → uploads to Storacha → stores CID on contract → contract schedules its own check-in deadline

2. **Heartbeat:** User checks in → cancels existing scheduled tx → schedules new one

3. **Auto-trigger:** Scheduled tx fires automatically → `triggered = true`

4. **Discovery:** Beneficiary visits app → connects wallet → sees all vaults where they are recovery address → selects triggered vault

5. **Claim:** Beneficiary requests claim → Lit verifies `triggered == true` → decrypts key → beneficiary gets recovery wallet private key

## User Flows

### Vault Owner Flow
1. Connect Flow wallet
2. Click "Create Vault"
3. Enter beneficiary address (the recovery address)
4. Set inactivity period (e.g., 30 days)
5. System generates recovery wallet, encrypts, stores CID
6. Save recovery wallet address to share with beneficiary
7. Periodically heartbeat to reset timer

### Beneficiary Flow
1. Receive vault info from vault owner (out-of-band: will, email, etc.)
2. Visit app and connect wallet
3. App automatically shows: "You are beneficiary of X vaults"
4. See vault status (active/triggered)
5. When triggered: click "Claim" to decrypt recovery key
6. Receive recovery wallet private key
7. Import into wallet to access funds

### The Discovery Moment
**This is what makes Shard different from other inheritance tools:**

When the beneficiary connects their wallet, they IMMEDIATELY see:
- Any vaults where their address is the recovery address
- Current status of each vault
- Time until trigger or trigger status
- Clear "Claim" button when available

No need to remember a special link or code. The wallet address IS the key.

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
6. Beneficiary portal (wallet address discovery)
7. End-to-end test: setup → heartbeat → trigger → claim

## Why This Wins

1. **No keepers needed** — Flow's scheduled transactions are the killer feature
2. **No key exposure** — System generates recovery wallet
3. **Automatic beneficiary discovery** — Wallet address IS the key
4. **Self-custodial** — No third party can freeze or access
5. **Deep sponsor integration** — Cadence, Lit, Storacha all properly utilized

## The Narrative for Judges

"Your vault wakes up on its own if you stop checking in. Your beneficiary doesn't need to remember anything — they just connect their wallet and the app shows them their vaults. The blockchain handles the trust, Flow handles the automation, and Lit handles the key release. It's inheritance that actually works."
