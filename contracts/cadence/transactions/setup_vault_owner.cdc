import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(
    recoveryAddress: Address,
    inactivityPeriodDays: UInt64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Check if VaultOwner already exists
        if signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath) == nil {
            // Create VaultOwner for this account
            let vaultOwner <- create VaultOwner(signer.address)
            signer.storage.save(<-vaultOwner, to: Shard.vaultStoragePath)
        }

        // Get VaultOwner reference
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let inactivityPeriodSeconds = UFix64(inactivityPeriodDays) * 86400.0

        // Create vault
        let vaultId = vaultOwner.createVault(
            recoveryAddress: recoveryAddress,
            inactivityPeriodSeconds: inactivityPeriodSeconds
        )

        log("Created vault: ".concat(vaultId.toString()))

        // Schedule first heartbeat check
        vaultOwner.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: inactivityPeriodSeconds
        )

        log("Scheduled heartbeat check")
    }
}