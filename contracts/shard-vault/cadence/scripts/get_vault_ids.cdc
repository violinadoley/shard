import "Shard"

pub fun main(owner: Address): [UInt64] {
    let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
        from: Shard.vaultStoragePath
    ) ?? panic("VaultOwner not found")

    return vaultOwner.vaultIds
}