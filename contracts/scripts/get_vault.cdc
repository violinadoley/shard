import "Shard"

pub fun main(): AnyStruct {
    let vault = Shard.account.storage.borrow<&Shard.Vault>(
        from: /storage/shardVaults
    ) ?? panic("Vault not found")

    return {
        "id": vault.id,
        "owner": vault.owner,
        "recoveryAddress": vault.recoveryAddress,
        "inactivityPeriodSeconds": vault.inactivityPeriodSeconds,
        "lastHeartbeat": vault.lastHeartbeat,
        "triggered": vault.triggered,
        "recoveryWalletCID": vault.recoveryWalletCID,
        "timeUntilTrigger": vault.getTimeUntilTrigger()
    }
}