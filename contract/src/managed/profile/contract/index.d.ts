import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum State { EMPTY = 0, LIVE = 1 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  setProfile(context: __compactRuntime.CircuitContext<PS>,
             name_0: string,
             bio_0: string): __compactRuntime.CircuitResults<PS, []>;
  updateProfile(context: __compactRuntime.CircuitContext<PS>,
                name_0: string,
                bio_0: string): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  setProfile(context: __compactRuntime.CircuitContext<PS>,
             name_0: string,
             bio_0: string): __compactRuntime.CircuitResults<PS, []>;
  updateProfile(context: __compactRuntime.CircuitContext<PS>,
                name_0: string,
                bio_0: string): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array, sequence_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  setProfile(context: __compactRuntime.CircuitContext<PS>,
             name_0: string,
             bio_0: string): __compactRuntime.CircuitResults<PS, []>;
  updateProfile(context: __compactRuntime.CircuitContext<PS>,
                name_0: string,
                bio_0: string): __compactRuntime.CircuitResults<PS, []>;
  publicKey(context: __compactRuntime.CircuitContext<PS>,
            sk_0: Uint8Array,
            sequence_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly state: State;
  readonly profileName: { is_some: boolean, value: string };
  readonly profileBio: { is_some: boolean, value: string };
  readonly sequence: bigint;
  readonly owner: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
