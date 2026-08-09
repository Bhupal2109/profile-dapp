import { ProfileSimulator } from "./profile-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import { State } from "../managed/profile/contract/index.js";

setNetworkId("undeployed");

describe("Profile smart contract", () => {
  it("initializes an empty profile state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new ProfileSimulator(key);
    const simulator1 = new ProfileSimulator(key);

    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it("stores a profile with public metadata and the creator as owner", () => {
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

  it("allows the owner to update the profile", () => {
    const simulator = new ProfileSimulator(randomBytes(32));
    simulator.setProfile("Ada", "Builder of proofs");
    simulator.updateProfile("Grace", "Researcher and cryptographer");

    const ledgerState = simulator.getLedger();
    expect(ledgerState.profileName.is_some).toEqual(true);
    expect(ledgerState.profileName.value).toEqual("Grace");
    expect(ledgerState.profileBio.is_some).toEqual(true);
    expect(ledgerState.profileBio.value).toEqual(
      "Researcher and cryptographer",
    );
    expect(ledgerState.owner).toEqual(simulator.publicKey());
    expect(ledgerState.sequence).toEqual(1n);
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
