import "Shard"
import "FlowTransactionSchedulerUtils"

transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vault = Shard.account.storage.borrow<&Shard.Vault>(
            from: /storage/shardVaults
        ) ?? panic("Vault not found")

        if let existingTxID = vault.scheduledTxID {
            let admin = signer.storage.borrow<&Shard.Admin>(from: /storage/shardAdmin)
                ?? panic("Admin not found")
            admin.cancelScheduledTx(existingTxID)
            log("Cancelled existing scheduled tx")
        }

        vault.heartbeat()
        log("Heartbeat recorded")

        let admin = signer.storage.borrow<&Shard.Admin>(from: /storage/shardAdmin)
            ?? panic("Admin not found")
        admin.scheduleHeartbeatCheck(
            vaultId: vault.id,
            delaySeconds: vault.inactivityPeriodSeconds
        )
        log("Scheduled new heartbeat check")
    }
}