import "Shard"

transaction(vaultId: UInt64, pkpWalletAddress: String) {
    prepare(signer: auth(Storage) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let vault = vaultOwner.getVault(vaultId)
            ?? panic("Vault not found")

        if vault.owner != signer.address {
            panic("Not the vault owner")
        }

        vault.setRecoveryWalletAddress(pkpWalletAddress)
        log("Recovery wallet address set: ".concat(pkpWalletAddress))
    }
}
