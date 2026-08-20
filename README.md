# Hello World — Midnight Network dApp

A Level 2 dApp on the Midnight Network: a browser UI with Lace wallet integration, ZK-proof-backed circuit calls, and a Compact smart contract deployed on the Midnight Preview testnet.

## 🌐 Live Demo

> **Demo URL:** TODO — deploy `ui/dist/` to a static host (Netlify, Vercel, GitHub Pages) and replace this line with the real URL.
>
> **Preview testnet contract address:** `23329775f6214e5e610b4bd300a9a498afc16b6b291a286430f38981d55f7763`

## 🔒 Privacy Model

This dApp demonstrates Midnight's selective-disclosure privacy model using the `storeMessage` circuit.

| What | Visibility |
|---|---|
| The `message` ledger field | **Public** — written to the chain via `disclose()`, readable by anyone |
| The circuit input (`customMessage`) before disclosure | **Private** — exists only inside the ZK proof; never sent to the chain or the proof server in plaintext |
| Wallet shielded keys (coin key, encryption key) | **Private** — held by Lace; the dApp receives only the public key handles needed to balance transactions |
| Transaction balancing | **Private** — done inside Lace via the DApp Connector API; the dApp never sees the raw signing keys |
| Private input field in the browser | **Cleared** — the input field is cleared from browser memory immediately after a successful submission |

### How the circuit works

```compact
export ledger message: Opaque<"string">;   // public on-chain state

export circuit storeMessage(customMessage: Opaque<"string">): [] {
    message = disclose(customMessage);     // moves private input → public ledger
}
```

- `customMessage` is a **private circuit input** — it is passed to the ZK proof system as a witness. The proof attests that the prover *knows* a valid input without revealing it to validators or the proof server.
- `disclose()` explicitly moves the value from private witness space onto the public ledger. This is the only way data crosses the privacy boundary.
- An observer on-chain can read the stored `message` (it is intentionally public), but cannot learn anything about the wallet's shielded balance, private keys, or any other private inputs used during proof generation.

### What the frontend does to protect private inputs

- The message input field uses `type="text"` with `autoComplete="off"` — no browser autofill persistence.
- The input value is held only in React component state (memory), never written to `localStorage`, `sessionStorage`, or any URL parameter.
- The value is cleared from state immediately after a successful `storeMessage` call.
- Error messages never include the private input value.
- No `console.log` of the private input anywhere in the UI code.

## Browser UI (Lace wallet integration)

### UI quick start

Requirements: Node 22, [Midnight Lace wallet](https://midnight.network/lace) browser extension connected to the **Preview** testnet.

```bash
cd ui
npm install
npm run dev          # local dev server at http://localhost:5173
```

The dev server uses `.env.preview` by default (Preview network, real deployed contract).

To build for production:

```bash
npm run build -- --mode preview   # outputs to ui/dist/
```

Before serving the build, copy the compiled contract assets into `ui/public/contract/`:

```bash
cp -r ../contracts/managed/hello-world/contract/* ui/public/contract/
cp -r ../contracts/managed/hello-world/keys       ui/public/
cp -r ../contracts/managed/hello-world/zkir       ui/public/
```

The UI connects to the already-deployed Preview contract at the address above. No local devnet or proof server needed — the public Preview proof server is used by default.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_NETWORK_ID` | Midnight network: `preview` or `preprod` |
| `VITE_CONTRACT_ADDRESS` | Deployed contract address (hex) |
| `VITE_INDEXER_URL` | Indexer GraphQL HTTP URL |
| `VITE_INDEXER_WS_URL` | Indexer GraphQL WebSocket URL |
| `VITE_PROOF_SERVER_URL` | Proof server URL (Lace's public server or your own) |

Copy `ui/.env.example` to `ui/.env` and fill in values, or use the pre-filled `ui/.env.preview`.

## CLI quick start

Requirements: Node 22, Docker (with Compose v2), and the Compact compiler at the version pinned in `.compact-version` at the create-mn-app repo root.

```bash
npm install
npm run setup
npm run test:e2e
```

`npm run setup` runs end-to-end with no prompts:

1. `docker compose up -d --wait` — starts a local Midnight devnet (node, indexer, proof-server).
2. `npm run compile` — compiles `contracts/hello-world.compact` to `contracts/managed/hello-world/`.
3. `npm run deploy` — derives the genesis-seed wallet, registers UTXOs for DUST generation, deploys the contract, writes `.midnight-state.json`.

`npm run test:e2e` reconnects to the deployed contract and reads its ledger state.

## Local devnet

The project ships its own devnet via `docker-compose.yml`:

| Service        | Port | Purpose                                         |
| -------------- | ---- | ----------------------------------------------- |
| `node`         | 9944 | Midnight node, `dev` chain preset               |
| `indexer`      | 8088 | GraphQL indexer for chain state                 |
| `proof-server` | 6300 | Generates ZK proofs for contract transactions   |

```bash
docker compose down -v   # tear down and remove all volumes
```

## ⚠️ LOCAL DEVNET ONLY

The deploy script uses a well-known genesis seed (`0000…0001`) so the pre-minted NIGHT in the `dev` chain preset is immediately available. **Do not use this seed against Preview, Preprod, mainnet, or any environment that handles real value.**

## Networks

| Network | When to use | Default? |
|---|---|---|
| `undeployed` | Local devnet bundled in `docker-compose.yml`. Genesis seed is hardcoded; no funding needed. | yes |
| `preview` | Public preview testnet. Faucet at `https://midnight-tmnight-preview.nethermind.dev`. | |
| `preprod` | Public preprod testnet. Faucet at `https://midnight-tmnight-preprod.nethermind.dev`. | |

```sh
npm run setup -- --network preview   # deploy to preview
npm run network preview              # switch active network
npm run network                      # print current active network
```

### Environment overrides

| Variable | Effect |
|---|---|
| `MIDNIGHT_WALLET_SEED` | Use this hex seed instead of generating one. |
| `MIDNIGHT_WALLET_MNEMONIC` | Use this BIP-39 recovery phrase. |
| `MIDNIGHT_INDEXER_URL` | Override the indexer GraphQL URL. |
| `MIDNIGHT_INDEXER_WS_URL` | Override the indexer WS URL. |
| `MIDNIGHT_NODE_URL` | Override the node RPC URL. |
| `MIDNIGHT_PROOF_SERVER_URL` | Override the proof server URL. |
| `MIDNIGHT_FAUCET_TIMEOUT_MS` | Faucet poll budget in ms (default 600000). |

## Available scripts

| Script                  | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `npm run setup`         | One-shot: start devnet, compile, deploy.                       |
| `npm run compile`       | Compile the Compact contract.                                  |
| `npm run deploy`        | Deploy the compiled contract.                                  |
| `npm run cli`           | Interactive CLI to call circuits on the deployed contract.     |
| `npm run check-balance` | Print the wallet's NIGHT and DUST balances.                    |
| `npm run test:e2e`      | Smoke + read-back check against the deployed contract.         |
| `npm run clean`         | Remove `contracts/managed/`, `.midnight-state.json`, and `.midnight-wallet-state/`. |
| `npm run ui:dev`        | Start the browser UI dev server (`cd ui && npm run dev`).      |
| `npm run ui:build`      | Build the browser UI for production.                           |

## Project structure

```
demo/
├── contracts/
│   └── hello-world.compact          # Compact source
├── ui/                              # Browser frontend (Lace DApp Connector)
│   ├── src/
│   │   ├── App.tsx                  # Wallet connect/disconnect, circuit call UI
│   │   ├── wallet.ts                # DApp Connector API + provider setup
│   │   ├── contract.ts              # findDeployedContract wrapper
│   │   ├── main.tsx                 # React entry point
│   │   └── vite-env.d.ts            # Vite ImportMeta types
│   ├── .env.preview                 # Preview network config (real contract address)
│   ├── .env.preprod                 # Preprod network config (needs deployment)
│   ├── .env.example                 # Template for environment variables
│   ├── package.json                 # @midnight-ntwrk/dapp-connector-api + Midnight.js
│   └── vite.config.ts
├── scripts/
│   └── e2e-check.ts                 # smoke + read-back
├── src/
│   ├── network.ts                   # network selection + state file management
│   ├── wallet.ts                    # wallet construction + sync-state cache
│   ├── setup.ts                     # orchestrator for `npm run setup`
│   ├── deploy.ts                    # deploy the contract
│   ├── cli.ts                       # interact with deployed contract
│   └── check-balance.ts             # NIGHT / DUST balance
├── docker-compose.yml               # node + indexer + proof-server
├── .midnight-state.json             # written by deploy (gitignored — contains wallet seed)
├── .midnight-wallet-state/          # serialized sync state per network (gitignored)
├── package.json
└── tsconfig.json
```

## Compact compiler version

```bash
compact update <version>
compact use <version>
```

## ⚠️ Security notice

`.midnight-state.json` is gitignored and contains the wallet seed and BIP-39 recovery phrase for any public-network wallets created by the deploy scripts. **Never commit this file.** If you have already pushed it to a public repository, rotate the wallet immediately by generating a new one.
