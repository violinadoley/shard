import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(vaultId: UInt64) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        // Get vault to check it's not triggered
        let vault = vaultOwner.getVault(vaultId)
            ?? panic("Vault not found")

        // Cancel existing scheduled tx
        vaultOwner.cancelScheduledTx(vaultId)

        // Record heartbeat
        vault.heartbeat()
        log("Heartbeat recorded")

        // Schedule new heartbeat check
        vaultOwner.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: vault.inactivityPeriodSeconds
        )
        log("Scheduled new heartbeat check")
    }
}