import "Shard"

access(all) fun main(owner: Address): [UInt64] {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
        ?? panic("VaultOwner not found for address")

    return vaultOwner.vaultIds
}
