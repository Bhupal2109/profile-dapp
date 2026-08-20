import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as HelloWorldContract from '/contract/index.js?url';
import type { Providers } from './wallet';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
const PRIVATE_STATE_ID = 'helloWorldPrivateState';

// hello-world has no witnesses so private state is always empty
const EMPTY_PRIVATE_STATE = {};

// Minimal in-memory private state provider (hello-world has no witnesses)
function makePrivateStateProvider() {
  const store = new Map<string, unknown>();
  return {
    get: async (id: string) => store.get(id) ?? null,
    set: async (id: string, state: unknown) => { store.set(id, state); },
    remove: async (id: string) => { store.delete(id); },
  };
}

// Build the CompiledContract once and reuse it
const compiledContract = (CompiledContract.make as any)(
  'hello-world',
  HelloWorldContract.Contract,
).pipe(CompiledContract.withVacantWitnesses);

export interface DeployedContract {
  /** Call the storeMessage circuit — App clears private input after success */
  callTx: { storeMessage(msg: string): Promise<any> };
  /** Read the current public ledger state */
  readMessage(): Promise<string>;
}

export async function joinContract(providers: Providers): Promise<DeployedContract> {
  const deployed: any = await findDeployedContract(
    {
      privateStateProvider: makePrivateStateProvider() as any,
      publicDataProvider: providers.publicDataProvider,
      zkConfigProvider: providers.zkConfigProvider as any,
      proofProvider: providers.proofProvider,
      walletProvider: providers.walletProvider,
      midnightProvider: providers.midnightProvider,
    },
    {
      compiledContract: compiledContract as any,
      contractAddress: CONTRACT_ADDRESS,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: EMPTY_PRIVATE_STATE,
    },
  );

  return {
    callTx: deployed.callTx,
    async readMessage(): Promise<string> {
      const state = await providers.publicDataProvider.queryContractState(CONTRACT_ADDRESS);
      if (!state) return '';
      // ledger().message returns a string (CompactTypeOpaqueString)
      const ledgerState = HelloWorldContract.ledger(state.data);
      return (ledgerState.message as string) ?? '';
    },
  };
}
