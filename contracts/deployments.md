# Deployments

## Arc Testnet (chain 5042002)

| | |
|---|---|
| IdentityRegistry | [`0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7`](https://explorer.testnet.arc.io/address/0x1c36829d1d82470bfb9FAd9bE264729c26753Ef7) — source verified |
| Deploy tx | `0x20dfe04e38c4775bd8a627bdd0e6abb4a5d2739d898d4140b0a5c52bf41f0d5e`, block 65110233 |
| Owner | `0x2e2729F897D4E5799ADe12B3D911b40BA0307Aa4` |
| Attester | `0x3697261D15fB3c0b945120450773f7B27D4344d2` |
| Recovery attester | `0x2e2729F897D4E5799ADe12B3D911b40BA0307Aa4` |
| Recovery delay | 3 days |
| Deployed | 2026-10-02 |

Testnet only: the owner, the recovery attester and the deployer are the same key here.
Before mainnet the owner must be a multisig and the recovery attester a separate cold key
(see `docs/identity-recovery.md`).

## Arc mainnet (chain 5042)

| | |
|---|---|
| IdentityRegistry | [`0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF`](https://explorer.arc.io/address/0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF) — source verified on [Sourcify](https://repo.sourcify.dev/5042/0xB417597Eb5dd49b69f3a573ad73Fc8B528a16dcF) (exact match) |
| Deploy tx | `0xbca22f8008475168b08c205393fb490bb9bbd0f30a27239d77f9ba6909cd63e4`, block 24877959 |
| Owner | `0x98502367d340B3838E083fA560F8BB33bD3B7DC7` (also the deployer; a plain key, not a multisig) |
| Attester | `0x3697261D15fB3c0b945120450773f7B27D4344d2` (same backend key as testnet, by decision) |
| Recovery attester | `0x141abcA329175e7074F3Baaf46B2eAb62498d1BB` |
| Recovery delay | 3 days |
| Deployed | 2026-10-08 |

Before any real user registers:

- **Move ownership to a multisig.** The owner can rotate the recovery attester
  and cancel or pause recovery, so whoever holds the owner key can still take
  over any handle. `transferOwnership(multisig)`, then the multisig calls
  `acceptOwnership()` (Ownable2Step).
- **Audit.** The contract has not been audited.

Decided 2026-10-08: mainnet and testnet share the registration attester key and
the Supabase project. Signatures are bound to the chain and contract, so a
testnet attestation cannot be replayed on mainnet; but any environment holding
`ATTESTATION_SIGNER_KEY` can sign mainnet registrations, so keep it out of
preview and test deployments. Rotate with `setAttester` if that changes.

Verifying on mainnet: `explorer.arc.io/api` answers scripted requests with a
Cloudflare challenge, so the Blockscout verifier fails. Sourcify supports Arc
mainnet and works:
`arc-forge verify-contract <address> src/IdentityRegistry.sol:IdentityRegistry --chain-id 5042 --verifier sourcify`
