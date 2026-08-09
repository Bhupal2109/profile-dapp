// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ProfileSimulator } from "./profile-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import { State } from "../managed/profile/contract/index.js";

setNetworkId("undeployed");

describe("Profile smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new ProfileSimulator(key);
    const simulator1 = new ProfileSimulator(key);
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("properly initializes ledger state and private state", () => {
    const key = randomBytes(32);
    const simulator = new ProfileSimulator(key);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.sequence).toEqual(1n);
    expect(initialLedgerState.profileName.is_some).toEqual(false);
    expect(initialLedgerState.profileName.value).toEqual("");
    expect(initialLedgerState.profileBio.is_some).toEqual(false);
    expect(initialLedgerState.profileBio.value).toEqual("");
    expect(initialLedgerState.owner).toEqual(new Uint8Array(32));
    expect(initialLedgerState.state).toEqual(State.EMPTY);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secretKey: key });
  });

  it("creates a profile for the current wallet", () => {
    const simulator = new ProfileSimulator(randomBytes(32));
    simulator.setProfile("Ada", "Builder of proofs");

    const ledgerState = simulator.getLedger();
    expect(ledgerState.sequence).toEqual(1n);
    expect(ledgerState.profileName.is_some).toEqual(true);
    expect(ledgerState.profileName.value).toEqual("Ada");
    expect(ledgerState.profileBio.is_some).toEqual(true);
    expect(ledgerState.profileBio.value).toEqual("Builder of proofs");
    expect(ledgerState.owner).toEqual(simulator.publicKey());
    expect(ledgerState.state).toEqual(State.LIVE);
  });

  it("rejects profile updates from a different wallet", () => {
    const simulator = new ProfileSimulator(randomBytes(32));
    simulator.setProfile("Ada", "Builder of proofs");
    simulator.switchUser(randomBytes(32));

    expect(() => simulator.updateProfile("Eve", "Intruder")).toThrow(
      "failed assert: Attempted to update a profile that is not owned by the current wallet",
    );
  });
});
