import "Shard"

pub fun main(owner: Address, vaultId: UInt64): Bool {
    let vaultOwner = Shard.account.storage.borrow<&Shard.VaultOwner>(
        from: Shard.vaultStoragePath
    ) ?? panic("VaultOwner not found")

    let vault = vaultOwner.getVault(vaultId)
        ?? panic("Vault not found")

    return vault.triggered
}