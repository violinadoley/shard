import "Shard"

access(all) fun main(owner: Address, vaultId: UInt64): Bool {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
        ?? panic("VaultOwner not found for address")

    return vaultOwner.getVaultTriggered(vaultId) ?? false
}
