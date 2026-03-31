import "Shard"

pub fun main(owner: Address, vaultId: UInt64): AnyStruct {
    let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
        from: Shard.vaultStoragePath
    ) ?? panic("VaultOwner not found")

    let vault = vaultOwner.getVault(vaultId)
        ?? panic("Vault not found")

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