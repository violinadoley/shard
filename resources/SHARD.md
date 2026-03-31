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
| Encryption | Lit Protocol v3 (Chipotle) | Conditional secret release |
| Storage | Storacha | Encrypted key blob with CID |
| Frontend | Next.js + FCL | User wallet connection |

## Bounty Targets

| Sponsor | Priority | Notes |
|---------|----------|-------|
| **Flow ($10k)** | Critical | Cadence + scheduled transactions (Forte) |
| **Storacha** | Critical | w3up-client for encrypted blob |
| **Lit Protocol** | Critical | v3 Chipotle for conditional decrypt |
| **Fresh Code ($50k)** | High | Novel keeper-less inheritance |
| **Infrastructure & Digital Rights** | Medium | Wallet recovery theme |

---

## Lit Protocol Chipotle (v3) Setup

**Chipotle** is Lit's new v3 network - REST API based, no SDK required.

### Important: Network Migration

- **Naga (v1) sunset:** April 1, 2026
- **Chipotle (v3) is production:** Live since March 25, 2026
- **Datil is dead** - Do NOT use

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

Response:
```json
{"api_key": "your-api-key", "wallet_address": "0x..."}
```

### Step 2: Add Funds

1. Go to https://dashboard.dev.litprotocol.com/dapps/dashboard/
2. Click "Add Funds"
3. Pay with credit card (minimum $5)

Or via API:
```bash
# Get Stripe config
curl "https://api.dev.litprotocol.com/core/v1/billing/stripe_config"

# Check balance
curl "https://api.dev.litprotocol.com/core/v1/billing/balance" \
  -H "X-Api-Key: YOUR-API-KEY"
```

### Step 3: Create Usage API Key

Create a usage API key with execute permissions:
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

Response:
```json
{"usage_api_key": "your-usage-api-key"}
```

**Store this key securely** - it's shown only once!

### Step 4: Create PKP (Wallet) for Recovery

```bash
curl "https://api.dev.litprotocol.com/core/v1/create_wallet" \
  -H "X-Api-Key: YOUR-API-KEY"
```

Response:
```json
{"wallet_address": "0x...", "pkp_id": "..."}
```

### Step 5: Run Lit Actions

Execute a Lit Action to handle encrypted key release:

```bash
curl -X POST "https://api.dev.litprotocol.com/core/v1/lit_action" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: YOUR-USAGE-API-KEY" \
  -d '{
    "code": "async function main({ pkpId }) { return { hello: \"world\" }; }",
    "js_params": {}
  }'
```

### API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/new_account` | POST | Create account |
| `/account_exists` | GET | Verify account |
| `/add_usage_api_key` | POST | Create usage key |
| `/create_wallet` | GET | Create PKP |
| `/list_wallets` | GET | List PKPs |
| `/add_group` | POST | Create group |
| `/lit_action` | POST | Execute Lit Action |
| `/billing/balance` | GET | Check balance |

Full OpenAPI spec: https://api.dev.litprotocol.com/core/v1/openapi.json

---

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

## Critical Warnings

1. **Naga is DEAD (April 1, 2026)** — Use Chipotle v3 only
2. **Cadence over Solidity** — judges expect Cadence
3. **Never upload user private keys** — system generates fresh wallets
4. **No Zama** — FHE is wrong tool for conditional key release

## Development Order

1. Flow CLI + testnet account + faucet
2. Storacha account + w3up-client test
3. Lit Chipotle account + fund + create usage API key
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
