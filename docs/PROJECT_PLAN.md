# PL Genesis: Frontiers of Collaboration - Hackathon Plan

**Event:** Protocol Labs Hackathon
**Dates:** Ends March 31, 2026
**Total Prize Pool:** $150,000+

## Sponsor Bounties to Target

| Sponsor | Bounty Pool | Why Shard Fits |
|---------|-------------|----------------|
| **Flow** | $10,000 | Uses scheduled transactions in Cadence (Forte upgrade) |
| **Storacha** | Separate pool | Encrypted key blob stored via w3up-client |
| **Fresh Code** | $50,000 | Novel keeper-less inheritance system |
| **Infrastructure & Digital Rights** | Themed bounty | Wallet recovery = digital rights |
| **Lit Protocol** | Access control bounty | Conditional decryption |
| **Filecoin** | Storage bounty | Data persists on Filecoin via Storacha |

## Other Sponsors (For Awareness)

- Filecoin
- Flow
- Impulse AI
- Lit Protocol
- NEAR
- Physical AI
- Starknet
- Storacha
- Zama
- World
- Hypercerts
- Ethereum Foundation

## Bounty Strategy

### Primary Targets (High Priority)
1. **Flow ($10k)** — Use Cadence + scheduled transactions. This is the flagship Forte feature.
2. **Storacha** — Use w3up-client for encrypted blob storage.
3. **Lit Protocol** — Use v8 Naga SDK for conditional decryption.

### Secondary Targets
4. **Fresh Code ($50k)** — Self-custodial, keeper-less inheritance is novel.
5. **Infrastructure & Digital Rights** — Wallet recovery fits the theme.

### Why NOT Zama
FHE is for confidential computation. Shard needs conditional key release. Lit is the right tool. Adding Zama would dilute coherence and eat time.

## Submission Requirements Checklist

- [ ] Working end-to-end demo
- [ ] Video demonstrating the full flow
- [ ] Deployed on Flow testnet
- [ ] Cadence contract using scheduled transactions
- [ ] Lit encryption working with nagaDev
- [ ] Storacha upload returning CID
- [ ] Clear narrative: "your vault wakes up on its own"

## Key Pitch Points for Judges

1. **No keepers needed** — Flow scheduled transactions self-trigger
2. **No key exposure** — Fresh wallet generation, never user upload
3. **Deep sponsor integration** — Using Forte flagship feature
4. **Real problem** — People lose crypto, families suffer
5. **Novel use case** — Self-custodial inheritance without third parties

## Time Allocation

Given deadline is TODAY (March 31, 2026):

| Task | Priority | Notes |
|------|----------|-------|
| Cadence contract with scheduled tx | Critical | Core differentiator |
| Lit v8 (Naga) integration | Critical | Must use nagaDev, NOT datil |
| Storacha w3up-client setup | Critical | Free tier, no tokens |
| Frontend + FCL wallet connection | High | Show Flow judges |
| End-to-end demo video | High | Judges care about working demo |
| Documentation | Medium | README + architecture docs |
