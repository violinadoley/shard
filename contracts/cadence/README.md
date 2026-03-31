# Flow Cadence Contracts

## Project: Shard

Dead Man's Switch Wallet Recovery using Flow Scheduled Transactions.

## Structure

```
cadence/
├── Shard.cdc           # Main vault contract
├── ShardNFT.cdc        # NFT representation (optional)
└── transactions/
    ├── create_vault.cdc
    ├── heartbeat.cdc
    ├── claim.cdc
    └── setup_recovery.cdc
```

## Key Features

### Scheduled Transactions (Forte Upgrade)

The contract uses Flow's native scheduled transactions to:
- Schedule check-in deadlines when vault is created
- Reschedule on each heartbeat
- Self-trigger when deadline passes without heartbeat

This eliminates the need for external keepers.

### Vault State

```cadence
pub struct Vault {
    pub var owner: Address
    pub var recoveryAddress: Address
    pub var inactivityPeriod: UInt64  // in seconds
    pub var lastHeartbeat: UInt64
    pub var triggered: Bool
    pub var recoveryWalletCID: String  // CID on Storacha
}
```

### Access Control

- Only vault owner can heartbeat
- Only beneficiary (recoveryAddress) can claim after trigger
- Scheduled transactions use contract-owned auth

## Setup

```bash
# Install Flow CLI
brew install flow-cli

# Initialize project
flow init

# Create testnet account
flow accounts create

# Deploy
flow project deploy --network testnet
```

## Testing

```bash
flow test
```

## Documentation

- Flow Docs: https://docs.onflow.org
- Cadence Tutorial: https://developers.flow.com/cadence/tutorial/first-steps
- Scheduled Transactions: https://developers.flow.com/cadence/advanced-concepts/scheduled-transactions
