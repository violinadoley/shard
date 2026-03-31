import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(
    recoveryAddress: Address,
    inactivityPeriodDays: UInt64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Create VaultOwner if it doesn't exist
        if signer.storage.borrow<&Shard.VaultOwner>(from: Shard.vaultStoragePath) == nil {
            // Fixed: create Shard.VaultOwner(_owner:) not create VaultOwner()
            let vaultOwner <- create Shard.VaultOwner(_owner: signer.address)
            signer.storage.save(<-vaultOwner, to: Shard.vaultStoragePath)

            // Publish public capability so Handler can trigger cross-account
            let cap = signer.capabilities.storage.issue<&{Shard.VaultOwnerPublic}>(Shard.vaultStoragePath)
            signer.capabilities.publish(cap, at: Shard.vaultOwnerPublicPath)
        }

        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let inactivityPeriodSeconds = UFix64(inactivityPeriodDays) * 86400.0

        let vaultId = vaultOwner.createVault(
            recoveryAddress: recoveryAddress,
            inactivityPeriodSeconds: inactivityPeriodSeconds
        )

        log("Created vault: ".concat(vaultId.toString()))

        vaultOwner.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: inactivityPeriodSeconds
        )

        log("Scheduled heartbeat check")
    }
}
