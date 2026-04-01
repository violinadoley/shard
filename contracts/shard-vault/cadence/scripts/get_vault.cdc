import "Shard"

access(all) fun main(owner: Address, vaultId: UInt64): Shard.VaultData {
    let vaultOwner = getAccount(owner)
        .capabilities.borrow<&{Shard.VaultOwnerPublic}>(at: /public/shardVaultOwner)
        ?? panic("VaultOwner not found for address")

    return vaultOwner.getVaultData(vaultId)
        ?? panic("Vault not found")
}
