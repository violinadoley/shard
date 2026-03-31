import "Shard"

transaction(vaultId: UInt64, recoveryWalletCID: String) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vaultOwner = signer.storage.borrow<&Shard.VaultOwner>(
            from: Shard.vaultStoragePath
        ) ?? panic("VaultOwner not found")

        let vault = vaultOwner.getVault(vaultId)
            ?? panic("Vault not found")

        // Verify signer is the owner
        if vault.owner != signer.address {
            panic("Not the vault owner")
        }

        vault.setRecoveryWalletCID(recoveryWalletCID)
        log("Recovery wallet CID set: ".concat(recoveryWalletCID))
    }
}