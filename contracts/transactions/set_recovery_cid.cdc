import "Shard"

transaction(recoveryWalletCID: String) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let vault = Shard.account.storage.borrow<&Shard.Vault>(
            from: /storage/shardVaults
        ) ?? panic("Vault not found")

        vault.setRecoveryWalletCID(recoveryWalletCID)
        log("Recovery wallet CID set: ".concat(recoveryWalletCID))
    }
}