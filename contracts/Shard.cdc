import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"

access(all) contract Shard {

    access(all) var totalVaults: UInt64

    access(all) resource interface VaultPublic {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let recoveryAddress: Address
        access(all) var inactivityPeriodSeconds: UFix64
        access(all) var lastHeartbeat: UFix64
        access(all) var triggered: Bool
        access(all) var recoveryWalletCID: String?
        access(all) var scheduledTxID: UInt64?
    }

    access(all) resource Vault: VaultPublic {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let recoveryAddress: Address
        access(all) var inactivityPeriodSeconds: UFix64
        access(all) var lastHeartbeat: UFix64
        access(all) var triggered: Bool
        access(all) var recoveryWalletCID: String?
        access(all) var scheduledTxID: UInt64?

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
            self.scheduledTxID = nil
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
            self.scheduledTxID = nil
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

    access(all) resource interface HandlerPublic {
        access(all) let vaultId: UInt64
    }

    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler, HandlerPublic {
        access(all) let vaultId: UInt64

        init(_vaultId: UInt64) {
            self.vaultId = _vaultId
        }

        access(FlowTransactionScheduler.Execute)
        fun executeTransaction(id: UInt64, data: AnyStruct?) {
            let vaultRef = Shard.account.storage.borrow<&Shard.Vault>(
                from: /storage/shardVaults
            ) ?? panic("Vault not found")

            vaultRef.trigger()
        }

        access(all) view fun getViews(): [Type] {
            return [Type<FlowTransactionScheduler.TransactionHandlerMetadata>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<FlowTransactionScheduler.TransactionHandlerMetadata>():
                    return FlowTransactionScheduler.TransactionHandlerMetadata(
                        description: "Shard Vault Handler for vault ".concat(self.vaultId.toString()),
                        handlerStoragePath: /storage/shardHandler
                    )
            }
            return nil
        }
    }

    access(all) resource Admin {
        access(all) fun createVault(
            recoveryAddress: Address,
            inactivityPeriodSeconds: UFix64
        ): UInt64 {
            let id = Shard.totalVaults + 1
            Shard.totalVaults = id

            let vault <- create Vault(
                _id: id,
                _owner: self.owner,
                _recoveryAddress: recoveryAddress,
                _inactivityPeriodSeconds: inactivityPeriodSeconds
            )

            let handler <- create Handler(_vaultId: id)

            let handlerStoragePath = /storage/shardHandler
            Shard.account.storage.save(<-handler, to: handlerStoragePath)

            let vaultStoragePath = /storage/shardVaults
            Shard.account.storage.save(<-vault, to: vaultStoragePath)

            return id
        }

        access(all) fun scheduleHeartbeatCheck(vaultId: UInt64, delaySeconds: UFix64) {
            let future = getCurrentBlock().timestamp + delaySeconds
            let priority = FlowTransactionScheduler.Priority.Medium
            let executionEffort: UInt64 = 1000

            let feeEstimate = FlowTransactionScheduler.calculateFee(
                executionEffort: executionEffort,
                priority: priority,
                dataSizeMB: 0.0
            )

            let vaultRef = Shard.account.storage.borrow<&Shard.Vault>(
                from: /storage/shardVaults
            ) ?? panic("Vault not found")

            let handlerRef = Shard.account.storage.borrow<&Shard.Handler>(
                from: /storage/shardHandler
            ) ?? panic("Handler not found")

            let manager = Shard.account.storage.borrow<&FlowTransactionSchedulerUtils.Manager>(
                from: FlowTransactionSchedulerUtils.managerStoragePath
            ) ?? panic("Manager not found")

            let handlerCap = Shard.account.capabilities.storage.issue<&{FlowTransactionScheduler.TransactionHandler}>(
                /storage/shardHandler
            )

            let fees <- (Shard.account.storage.borrow<&FlowToken.Vault>(
                from: /storage/flowTokenVault
            ) ?? panic("Missing FlowToken vault")).withdraw(amount: feeEstimate)

            manager.schedule(
                handlerCap: handlerCap,
                data: nil,
                timestamp: future,
                priority: priority,
                executionEffort: executionEffort,
                fees: <-fees
            )
        }

        access(all) fun cancelScheduledTx(_ txID: UInt64) {
            let manager = Shard.account.storage.borrow<&FlowTransactionSchedulerUtils.Manager>(
                from: FlowTransactionSchedulerUtils.managerStoragePath
            ) ?? panic("Manager not found")

            manager.cancel(txID: txID)
        }
    }

    access(all) fun getVault(): &Vault? {
        return Shard.account.storage.borrow<&Vault>(from: /storage/shardVaults)
    }

    init() {
        self.totalVaults = 0

        let manager <- FlowTransactionSchedulerUtils.createManager()
        Shard.account.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)

        let managerCap = Shard.account.capabilities.storage.issue<&FlowTransactionSchedulerUtils.Manager>(
            FlowTransactionSchedulerUtils.managerStoragePath
        )
        Shard.account.capabilities.publish(managerCap, at: FlowTransactionSchedulerUtils.managerPublicPath)

        let admin <- create Admin()
        Shard.account.storage.save(<-admin, to: /storage/shardAdmin)
    }
}