# Shard - Setup Guide

## Accounts and Wallets Needed

### 1. Flow (Cadence Contract)

**CLI Installation:**
```bash
brew install flow-cli
flow init
```

**Create Testnet Account:**
```bash
flow accounts create
```

**Testnet Faucet:** https://faucet.flow.com/create-account
- Enter your testnet account address
- Complete verification
- Receive 100,000 testnet FLOW tokens

**Flow EVM (Optional - for Lit access conditions):**
- RPC: https://testnet.evm.nodes.onflow.org
- Chain ID: 545
- Faucet accepts MetaMask addresses (0x...)

### 2. Lit Protocol (Encryption/Decryption)

**SDK:** Install `@lit-protocol/lit-node-client` (v8 only)
```bash
npm i @lit-protocol/lit-node-client
```

**⚠️ CRITICAL - Datil Shutdown:**
- Datil (V0) was permanently shut down February 25, 2026
- ALL datil-dev, datil-test, datil networks are DEAD
- Must use **Naga** network (Lit V1) with **v8 SDK**

**Network:** `nagaDev` (free, no tokens needed)
- nagaDev provides robust environment for building/testing
- nagaTest is paid (pre-production)
- nagaDev is sufficient for hackathon

**Wallet:** MetaMask for AuthSig (sign message to prove identity)
- No special tokens needed on nagaDev
- If minting PKPs: https://chronicle-yellowstone-faucet.getlit.dev for testLPX

### 3. Storacha (File Storage)

**Sign Up:** https://console.storacha.network
- Create free account
- Authenticate with email
- Create a "space"

**SDK:** `@web3-storage/w3up-client`
```bash
npm i @web3-storage/w3up-client
```

**No tokens or faucet needed.**
- Free tier is generous for hackathon (encrypted key blob < 1KB)
- Upload returns CID
- Data persists on Filecoin (Storacha renews deals)

### 4. Frontend Wallet (For Users)

**Option A (Recommended for Flow):** Flow Client Library
```bash
npm i @onflow/fcl @onflow/react-sdk
```
- Users connect with Flow Wallet, Blocto, or Lilico

**Option B (EVM):** wagmi + RainbowKit
- If keeping EVM compatibility

## What You DON'T Need

- Filecoin wallet or FIL tokens — Storacha abstracts this
- LITKEY tokens — nagaDev is free
- Real FLOW — testnet faucet gives 100k
- Separate wallets per service — one MetaMask + one Flow CLI account

## Quick Reference Table

| Service | Account | Wallet | Faucet | Cost |
|---------|---------|--------|--------|------|
| Flow | Flow CLI | Flow CLI keypair | faucet.flow.com | Free |
| Flow EVM | MetaMask | MetaMask | faucet.flow.com | Free |
| Lit | None | MetaMask | (nagaDev free) | Free |
| Storacha | Email | None | None | Free |

## Critical Warnings

1. **DO NOT use Datil networks** — shut down Feb 25, 2026
2. **Use v8 SDK for Lit** — v6/v7 target dead Datil
3. **Use nagaDev for testing** — free Lit V1 network
4. **Generate fresh recovery wallets** — never upload user private keys

## Development Order

1. Install Flow CLI, create testnet account, fund via faucet
2. Set up Storacha account, create space, verify w3up-client works
3. Set up Lit v8 SDK, verify nagaDev connection
4. Write Cadence contract with scheduled transactions
5. Build frontend with FCL wallet connection
6. Integrate all pieces end-to-end
7. Test the full flow: setup → heartbeat → trigger → claim
