import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"

access(all) contract Shard {

    access(all) var totalVaults: UInt64

    access(all) let vaultStoragePath: StoragePath
    access(all) let handlerStoragePath: StoragePath
    access(all) let managerStoragePath: StoragePath
    access(all) let vaultOwnerPublicPath: PublicPath

    access(all) event VaultCreated(ownerAddress: Address, recoveryAddress: Address, vaultId: UInt64)

    access(all) struct VaultData {
        access(all) let id: UInt64
        access(all) let ownerAddress: Address
        access(all) let recoveryAddress: Address
        access(all) let inactivityPeriodSeconds: UFix64
        access(all) let lastHeartbeat: UFix64
        access(all) let triggered: Bool
        access(all) let recoveryWalletCID: String?
        access(all) let recoveryWalletAddress: String?
        access(all) let timeUntilTrigger: UFix64

        init(
            id: UInt64, ownerAddress: Address, recoveryAddress: Address,
            inactivityPeriodSeconds: UFix64, lastHeartbeat: UFix64,
            triggered: Bool, recoveryWalletCID: String?, recoveryWalletAddress: String?,
            timeUntilTrigger: UFix64
        ) {
            self.id = id; self.ownerAddress = ownerAddress
            self.recoveryAddress = recoveryAddress
            self.inactivityPeriodSeconds = inactivityPeriodSeconds
            self.lastHeartbeat = lastHeartbeat; self.triggered = triggered
            self.recoveryWalletCID = recoveryWalletCID
            self.recoveryWalletAddress = recoveryWalletAddress
            self.timeUntilTrigger = timeUntilTrigger
        }
    }

    access(all) resource interface VaultOwnerPublic {
        access(all) let ownerAddress: Address
        access(all) var vaultIds: [UInt64]
        access(all) fun triggerVault(vaultId: UInt64)
        access(all) fun getVaultData(_ id: UInt64): Shard.VaultData?
        access(all) fun getVaultTriggered(_ id: UInt64): Bool?
    }

    access(all) resource VaultOwner: VaultOwnerPublic {
        access(all) let ownerAddress: Address
        access(all) var vaultIds: [UInt64]
        access(all) var vaults: @{UInt64: Vault}

        init(_owner: Address) {
            self.ownerAddress = _owner
            self.vaultIds = []
            self.vaults <- {}
        }

        access(all) fun createVault(
            recoveryAddress: Address,
            inactivityPeriodSeconds: UFix64
        ): UInt64 {
            let id = Shard.totalVaults + 1
            Shard.totalVaults = id

            let vault <- create Vault(
                _id: id,
                _ownerAddress: self.ownerAddress,
                _recoveryAddress: recoveryAddress,
                _inactivityPeriodSeconds: inactivityPeriodSeconds
            )
            self.vaults[id] <-! vault
            self.vaultIds.append(id)

            emit Shard.VaultCreated(
                ownerAddress: self.ownerAddress,
                recoveryAddress: recoveryAddress,
                vaultId: id
            )
            return id
        }

        access(all) fun getVault(_ id: UInt64): &Vault? {
            return &self.vaults[id] as &Vault?
        }

        access(all) fun triggerVault(vaultId: UInt64) {
            let vault = self.getVault(vaultId) ?? panic("Vault not found")
            vault.trigger()
        }

        access(all) fun getVaultData(_ id: UInt64): Shard.VaultData? {
            if let vault = self.getVault(id) {
                return Shard.VaultData(
                    id: vault.id, ownerAddress: vault.ownerAddress,
                    recoveryAddress: vault.recoveryAddress,
                    inactivityPeriodSeconds: vault.inactivityPeriodSeconds,
                    lastHeartbeat: vault.lastHeartbeat, triggered: vault.triggered,
                    recoveryWalletCID: vault.recoveryWalletCID,
                    recoveryWalletAddress: vault.recoveryWalletAddress,
                    timeUntilTrigger: vault.getTimeUntilTrigger()
                )
            }
            return nil
        }

        access(all) fun getVaultTriggered(_ id: UInt64): Bool? {
            return self.vaults[id]?.triggered
        }
    }

    access(all) resource Vault {
        access(all) let id: UInt64
        access(all) let ownerAddress: Address
        access(all) let recoveryAddress: Address
        access(all) var inactivityPeriodSeconds: UFix64
        access(all) var lastHeartbeat: UFix64
        access(all) var triggered: Bool
        access(all) var recoveryWalletCID: String?
        access(all) var recoveryWalletAddress: String?

        init(
            _id: UInt64, _ownerAddress: Address, _recoveryAddress: Address,
            _inactivityPeriodSeconds: UFix64
        ) {
            self.id = _id; self.ownerAddress = _ownerAddress
            self.recoveryAddress = _recoveryAddress
            self.inactivityPeriodSeconds = _inactivityPeriodSeconds
            self.lastHeartbeat = getCurrentBlock().timestamp
            self.triggered = false
            self.recoveryWalletCID = nil; self.recoveryWalletAddress = nil
        }

        access(all) fun heartbeat() {
            pre { !self.triggered: "Vault already triggered" }
            self.lastHeartbeat = getCurrentBlock().timestamp
        }

        access(all) fun trigger() {
            pre { !self.triggered: "Vault already triggered" }
            self.triggered = true
        }

        access(all) fun setRecoveryWalletCID(_ cid: String) {
            self.recoveryWalletCID = cid
        }

        access(all) fun setRecoveryWalletAddress(_ addr: String) {
            self.recoveryWalletAddress = addr
        }

        access(all) fun getTimeUntilTrigger(): UFix64 {
            if self.triggered { return 0.0 }
            let elapsed = getCurrentBlock().timestamp - self.lastHeartbeat
            if elapsed >= self.inactivityPeriodSeconds { return 0.0 }
            return self.inactivityPeriodSeconds - elapsed
        }
    }

    // Handler: called by Flow scheduler when inactivity period expires
    // Stored in user's account; triggers their vault cross-account via public capability
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(all) let vaultId: UInt64
        access(all) let ownerAddress: Address

        init(_vaultId: UInt64, _ownerAddress: Address) {
            self.vaultId = _vaultId
            self.ownerAddress = _ownerAddress
        }

        access(FlowTransactionScheduler.Execute)
        fun executeTransaction(id: UInt64, data: AnyStruct?) {
            let ownerRef = getAccount(self.ownerAddress)
                .capabilities.borrow<&{VaultOwnerPublic}>(Shard.vaultOwnerPublicPath)
                ?? panic("VaultOwner public capability not found")
            ownerRef.triggerVault(vaultId: self.vaultId)
        }

        access(all) view fun getViews(): [Type] { return [] }
        access(all) fun resolveView(_ view: Type): AnyStruct? { return nil }
    }

    // Create a Handler resource for a vault (called from transaction)
    access(all) fun createHandler(vaultId: UInt64, ownerAddress: Address): @Handler {
        return <- create Handler(_vaultId: vaultId, _ownerAddress: ownerAddress)
    }

    access(all) fun getVaultOwner(_ addr: Address): &{VaultOwnerPublic}? {
        return getAccount(addr)
            .capabilities.borrow<&{VaultOwnerPublic}>(Shard.vaultOwnerPublicPath)
    }

    init() {
        self.totalVaults = 0
        self.vaultStoragePath = /storage/shardVaultOwner
        self.handlerStoragePath = /storage/shardHandler
        self.managerStoragePath = /storage/shardSchedulerManager
        self.vaultOwnerPublicPath = /public/shardVaultOwner
    }
}
