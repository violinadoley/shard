import "Shard"

pub fun main(): Bool {
    let vault = Shard.account.storage.borrow<&Shard.Vault>(
        from: /storage/shardVaults
    ) ?? panic("Vault not found")

    return vault.triggered
}