import "Shard"
import "FlowTransactionSchedulerUtils"

transaction(
    recoveryAddress: Address,
    inactivityPeriodDays: UInt64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let admin = signer.storage.borrow<&Shard.Admin>(from: /storage/shardAdmin)
            ?? panic("Admin not found")

        let inactivityPeriodSeconds = UFix64(inactivityPeriodDays) * 86400.0

        let vaultId = admin.createVault(
            recoveryAddress: recoveryAddress,
            inactivityPeriodSeconds: inactivityPeriodSeconds
        )

        log("Created vault: ".concat(vaultId.toString()))

        admin.scheduleHeartbeatCheck(
            vaultId: vaultId,
            delaySeconds: inactivityPeriodSeconds
        )

        log("Scheduled heartbeat check")
    }
}