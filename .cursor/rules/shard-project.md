# Shard Project Rules

## Critical

- NEVER use Datil network for Lit — it's dead since Feb 25, 2026. Use nagaDev with v8 SDK.
- NEVER have users upload their own private keys. The system generates fresh recovery wallets.
- NEVER mock contract integrations with frontend.
- All contract addresses must be verified before interaction.

## Architecture

- Use **Cadence** for Flow contracts (not Solidity) to leverage scheduled transactions.
- Use **Lit v8** with nagaDev for conditional decryption.
- Use **Storacha** (w3up-client) for encrypted blob storage.
- Frontend uses **Flow FCL** for wallet connection.

## Sponsor Integration

- Flow bounty: Use scheduled transactions (Forte feature) — this is the main differentiator.
- Lit bounty: Conditional decryption gated by on-chain contract state.
- Storacha bounty: Encrypted blob storage with CID on-chain.

## No Zama

Zama FHE is for confidential computation (hidden balances, sealed bids). Shard needs conditional key release, which is Lit's job. Do NOT add Zama.

## File Organization

- Cadence contracts in `contracts/cadence/`
- Frontend in `frontend/` with Next.js + FCL
- Resources in `resources/` (architecture, plans)
- Docs in `docs/` (setup, project plan)
