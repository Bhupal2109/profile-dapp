# Profile DApp

A privacy-preserving Midnight profile DApp where users can create or update a profile entry on-chain while keeping the proof of ownership private.

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `0200dbf964f541e1950883f5b2f539b66fd6111e46ce8e6e9551fbdd180114d5dd5b` |

## Features

- Create a profile with a public name and bio
- Update the profile only when the current wallet owns it
- Prove wallet ownership without revealing the private secret key
- Connect to Midnight through the Lace wallet
- Use a production-ready frontend and API layer with placeholder deployment configuration

## What This Project Does

This application lets a user publish a verifiable profile record to a Midnight contract. The public ledger stores the profile metadata, while the wallet ownership proof remains private and is validated by the Compact contract during updates.

The Compact contract source lives in [contract/src/profile.compact](contract/src/profile.compact) and [contract/src/bboard.compact](contract/src/bboard.compact), and the generated managed bindings are stored under [contract/src/managed](contract/src/managed).

## Privacy Model

- Public information: the profile name, bio, sequence number, and owner public key
- Private information: the wallet secret key used to derive the ownership proof
- What users prove without revealing: ownership of the profile without exposing the secret key or raw wallet material

## Tech Stack

- Midnight Compact
- TypeScript
- React + MUI
- RxJS
- Vite
- Node.js

## Folder Structure

- contract/: Compact contract and generated bindings
- api/: shared API layer for deployment and contract interaction
- bboard-cli/: CLI entrypoint for wallet-driven contract interaction
- bboard-ui/: React web interface for profile creation and updates

## Prerequisites

- Node.js v22 or newer
- Docker Desktop running
- Lace wallet extension installed
- Access to a Midnight proof server

## Installation

```bash
npm install
cd api && npm install && cd ..
cd contract && npm install && cd ..
```

## Build

```bash
npm run build
```

## Compile

```bash
cd contract
npm run compact
cd ..
```

## Manual Deployment

Deployment is intentionally skipped in this scaffold. Run the deployment command manually once you are ready:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

## After Deployment

After you deploy the contract manually, the only remaining steps are:

1. Deploy the Compact contract.
2. Copy the deployed contract address.
3. Replace every occurrence of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>`.

No additional coding should be required.

## Environment Variables

- VITE_NETWORK_ID: selected Midnight network
- VITE_LOGGING_LEVEL: logging verbosity for the UI
- CONTRACT_ADDRESS: placeholder contract address used in the frontend configuration

## Screenshots

- Add screenshots here after deployment.

## Initial Idea

- Add the original idea summary here.

## Troubleshooting

- If the frontend cannot connect to Lace, confirm the wallet extension is authorized and the proof server is running.
- If the contract fails to compile, rerun the Compact compiler from the contract package.
- If the UI shows an error, verify the network ID and proof server endpoint.
| Docker issues                      | Ensure Docker Desktop is running, check `docker --version`                                                |
| Port 6300 in use                   | Run `docker compose down` then restart services                                                           |
| Dependencies won't install         | Use Node.js LTS version. For older npm versions, you may need `--legacy-peer-deps`                        |
| Contract deployment fails          | Verify wallet has sufficient balance and network connection                                               |

## Notes

- CLI and UI can run simultaneously and share the same proof server
- Proof server (Docker) is required for both CLI and UI to generate zero-knowledge proofs
- Contract must be compiled before building CLI or UI
- Fund your wallet using the testnet faucet before deploying contracts

## Implementation Notes

- **Transaction fee configuration**  
  The default `additionalFeeOverhead` value (`500_000_000_000_000_000n`) from `@midnight-ntwrk/testkit-js` is required on the `undeployed` network. Lower values can fail with `BalanceCheckOverspend` on the node side. On remote networks, that overhead requires too much dust, so the CLI overrides it to `1_000n`.
- CLI private state is stored per contract address, matching the `Midnight.js 4.x` private-state provider model.
