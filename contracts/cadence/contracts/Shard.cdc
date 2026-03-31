import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"

access(all) contract Shard {

    access(all) var totalVaults: UInt64

    // Storage paths
    static let vaultStoragePath: StoragePath = /storage/shardVault
    static let handlerStoragePath: StoragePath = /storage/shardHandler
    static let adminStoragePath: StoragePath = /storage/shardAdmin
    static let managerStoragePath: StoragePath = /storage/shardSchedulerManager

    // Store vault IDs per owner
    access(all) resource interface VaultOwnerPublic {
        access(all) let owner: Address
        access(all) let vaultIds: [UInt64]
    }

    access(all) resource VaultOwner: VaultOwnerPublic {
        access(all) let owner: Address
        access(all) var vaultIds: [UInt64]
        access(all) var vaults: @{UInt64: Vault}
        access(all) var handlers: @{UInt64: Handler}
        access(all) var scheduledTxIds: {UInt64: UInt64}

        init(_owner: Address) {
            self.owner = _owner
            self.vaultIds = []
            self.vaults <- {}
            self.handlers <- {}
            self.scheduledTxIds = {}
        }

        access(all) fun createVault(
            recoveryAddress: Address,
            inactivityPeriodSeconds: UFix64
        ): UInt64 {
            pre {
                self.vaults[Shard.totalVaults + 1] == nil: "Vault already exists"
            }

            let id = Shard.totalVaults + 1
            Shard.totalVaults = id

            let vault <- create Vault(
                _id: id,
                _owner: self.owner,
                _recoveryAddress: recoveryAddress,
                _inactivityPeriodSeconds: inactivityPeriodSeconds
            )

            self.vaults[id] <-! vault
            self.vaultIds.append(id)

            return id
        }

        access(all) fun getVault(_ id: UInt64): &Vault? {
            return &self.vaults[id] as &Vault?
        }

        access(all) fun scheduleHeartbeatCheck(vaultId: UInt64, delaySeconds: UFix64) {
            pre {
                self.vaults[vaultId] != nil: "Vault not found"
            }

            let future = getCurrentBlock().timestamp + delaySeconds
            let priority = FlowTransactionScheduler.Priority.Medium
            let executionEffort: UInt64 = 1000

            let feeEstimate = FlowTransactionScheduler.calculateFee(
                executionEffort: executionEffort,
                priority: priority,
                dataSizeMB: 0.0
            )

            let handler <- create Handler(_vaultId: vaultId, _owner: self.owner)
            self.handlers[vaultId] <-! handler

            let handlerRef = &self.handlers[vaultId] as &Handler

            let handlerCap = self.owner.capabilities.storage.issue<&{FlowTransactionScheduler.TransactionHandler}>(
                Shard.handlerStoragePath
            )

            let fees <- (self.owner.storage.borrow<&FlowToken.Vault>(
                from: /storage/flowTokenVault
            ) ?? panic("Missing FlowToken vault")).withdraw(amount: feeEstimate)

            let manager = self.owner.storage.borrow<&FlowTransactionSchedulerUtils.Manager>(
                from: Shard.managerStoragePath
            ) ?? panic("Manager not found")

            let txId = manager.schedule(
                handlerCap: handlerCap,
                data: nil,
                timestamp: future,
                priority: priority,
                executionEffort: executionEffort,
                fees: <-fees
            )

            self.scheduledTxIds[vaultId] = txId
        }

        access(all) fun cancelScheduledTx(_ vaultId: UInt64) {
            if let txId = self.scheduledTxIds[vaultId] {
                let manager = self.owner.storage.borrow<&FlowTransactionSchedulerUtils.Manager>(
                    from: Shard.managerStoragePath
                ) ?? panic("Manager not found")
                manager.cancel(txID: txId)
                self.scheduledTxIds.remove(key: vaultId)
            }
        }

        destroy() {
            destroy self.vaults
            destroy self.handlers
        }
    }

    access(all) resource Vault {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let recoveryAddress: Address
        access(all) var inactivityPeriodSeconds: UFix64
        access(all) var lastHeartbeat: UFix64
        access(all) var triggered: Bool
        access(all) var recoveryWalletCID: String?

        init(
            _id: UInt64,
            _owner: Address,
            _recoveryAddress: Address,
            _inactivityPeriodSeconds: UFix64
        ) {
            self.id = _id
            self.owner = _owner
            self.recoveryAddress = _recoveryAddress
            self.inactivityPeriodSeconds = _inactivityPeriodSeconds
            self.lastHeartbeat = getCurrentBlock().timestamp
            self.triggered = false
            self.recoveryWalletCID = nil
        }

        access(all) fun heartbeat() {
            pre {
                !self.triggered: "Vault already triggered"
            }
            self.lastHeartbeat = getCurrentBlock().timestamp
        }

        access(all) fun trigger() {
            pre {
                !self.triggered: "Vault already triggered"
            }
            self.triggered = true
            log("Vault triggered automatically")
        }

        access(all) fun setRecoveryWalletCID(_ cid: String) {
            self.recoveryWalletCID = cid
        }

        access(all) fun getTimeUntilTrigger(): UFix64 {
            if self.triggered {
                return 0.0
            }
            let elapsed = getCurrentBlock().timestamp - self.lastHeartbeat
            let remaining = self.inactivityPeriodSeconds - elapsed
            return remaining > 0.0 ? remaining : 0.0
        }
    }

    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(all) let vaultId: UInt64
        access(all) let owner: Address

        init(_vaultId: UInt64, _owner: Address) {
            self.vaultId = _vaultId
            self.owner = _owner
        }

        access(FlowTransactionScheduler.Execute)
        fun executeTransaction(id: UInt64, data: AnyStruct?) {
            let ownerRef = Shard.account.storage.borrow<&VaultOwner>(
                from: Shard.vaultStoragePath
            ) ?? panic("VaultOwner not found")

            let vaultRef = ownerRef.getVault(self.vaultId)
                ?? panic("Vault not found")

            vaultRef.trigger()

            log("Scheduled transaction executed for vault ".concat(self.vaultId.toString()))
        }

        access(all) view fun getViews(): [Type] {
            return [Type<FlowTransactionScheduler.TransactionHandlerMetadata>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<FlowTransactionScheduler.TransactionHandlerMetadata>():
                    return FlowTransactionScheduler.TransactionHandlerMetadata(
                        description: "Shard Vault Handler for vault ".concat(self.vaultId.toString()),
                        handlerStoragePath: Shard.handlerStoragePath
                    )
            }
            return nil
        }
    }

    access(all) fun getVaultOwner(_ addr: Address): &VaultOwner? {
        return Shard.account.storage.borrow<&VaultOwner>(from: Shard.vaultStoragePath)
    }

    init() {
        self.totalVaults = 0

        // Create and save manager
        let manager <- FlowTransactionSchedulerUtils.createManager()
        Shard.account.storage.save(<-manager, to: Shard.managerStoragePath)

        let managerCap = Shard.account.capabilities.storage.issue<&FlowTransactionSchedulerUtils.Manager>(
            Shard.managerStoragePath
        )
        Shard.account.capabilities.publish(managerCap, at: FlowTransactionSchedulerUtils.managerPublicPath)
    }
}