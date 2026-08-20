import { type ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  type Binding,
  type FinalizedTransaction,
  type Proof,
  type SignatureEnabled,
  Transaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import semver from 'semver';
import { filter, firstValueFrom, interval, map, take, timeout, throwError, concatMap } from 'rxjs';

const COMPATIBLE_API_VERSION = '4.x';
const NETWORK_ID = import.meta.env.VITE_NETWORK_ID as string;
const INDEXER_URL = import.meta.env.VITE_INDEXER_URL as string;
const INDEXER_WS_URL = import.meta.env.VITE_INDEXER_WS_URL as string;
const PROOF_SERVER_URL = import.meta.env.VITE_PROOF_SERVER_URL as string;

// Circuit key type for the hello-world contract
type HelloWorldCircuitKey = 'storeMessage';

export interface Providers {
  publicDataProvider: ReturnType<typeof indexerPublicDataProvider>;
  proofProvider: ReturnType<typeof httpClientProofProvider>;
  zkConfigProvider: FetchZkConfigProvider<HelloWorldCircuitKey>;
  walletProvider: {
    getCoinPublicKey(): string;
    getEncryptionPublicKey(): string;
    balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
  };
  midnightProvider: {
    submitTx(tx: FinalizedTransaction): Promise<string>;
  };
  connectedAPI: ConnectedAPI;
  /** Bech32m unshielded address of the connected wallet */
  address: string;
}

function findWallet(): InitialAPI | undefined {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (w): w is InitialAPI =>
      !!w &&
      typeof w === 'object' &&
      'apiVersion' in w &&
      semver.satisfies((w as InitialAPI).apiVersion, COMPATIBLE_API_VERSION),
  );
}

export async function connectWallet(): Promise<Providers> {
  // Poll for the Lace extension to inject window.midnight (up to 3 s)
  const initialAPI = await firstValueFrom(
    interval(100).pipe(
      map(() => findWallet()),
      filter((w): w is InitialAPI => !!w),
      take(1),
      timeout({
        first: 3_000,
        with: () =>
          throwError(
            () => new Error('Midnight Lace wallet not found. Is the extension installed and enabled?'),
          ),
      }),
    ),
  );

  // Connect and wait for user approval in Lace (up to 30 s)
  const connectedAPI = await firstValueFrom(
    interval(0).pipe(
      take(1),
      concatMap(() => initialAPI.connect(NETWORK_ID)),
      timeout({
        first: 30_000,
        with: () => throwError(() => new Error('Wallet connection timed out. Did you approve in Lace?')),
      }),
    ),
  );

  const config = await connectedAPI.getConfiguration();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  // dapp-connector-api 4.0.1: getUnshieldedAddress() returns { unshieldedAddress: string }
  const { unshieldedAddress } = await connectedAPI.getUnshieldedAddress();

  const zkConfigProvider = new FetchZkConfigProvider<HelloWorldCircuitKey>(
    window.location.origin,
    fetch.bind(window),
  );

  const proofServerUri = config.proverServerUri ?? PROOF_SERVER_URL;

  return {
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri ?? INDEXER_URL,
      config.indexerWsUri ?? INDEXER_WS_URL,
    ),
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    zkConfigProvider,
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      async balanceTx(tx: UnboundTransaction, _ttl?: Date): Promise<FinalizedTransaction> {
        // Serialize the unbound tx, send to Lace for balancing, deserialize result
        const serialized = toHex(tx.serialize());
        const received = await connectedAPI.balanceUnsealedTransaction(serialized);
        // String literal markers match ledger-v8 instance types (same pattern as bboard-ui)
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      async submitTx(tx: FinalizedTransaction): Promise<string> {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0] ?? '';
      },
    },
    connectedAPI,
    address: unshieldedAddress,
  };
}
