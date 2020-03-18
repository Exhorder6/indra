import { HashZero, One } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";

<<<<<<< HEAD:modules/cf-core/src/testing/scenarios/deploy-state-deposit-holder.spec.ts
import { Node } from "../../node";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../constants";

import { toBeEq } from "../bignumber-jest-matcher";
import { setup, SetupContext } from "../setup";
import { constructWithdrawRpc, createChannel, deployStateDepositHolder, deposit } from "../utils";
=======
import { Node } from "../../src";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import { createChannel, deployStateDepositHolder, deposit } from "./utils";
>>>>>>> 845-store-refactor:modules/cf-core/test/integration/deploy-state-deposit-holder.spec.ts

expect.extend({ toBeEq });

describe("Node method follows spec - deploy state deposit holder", () => {
  let nodeA: Node;
  let nodeB: Node;
  let provider: JsonRpcProvider;
  let multisigAddress: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global, true, true);
    provider = new JsonRpcProvider(global["ganacheURL"]);
    nodeA = context["A"].node;
    nodeB = context["B"].node;

    multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();
  });

  it("deploys the multisig when the method is called", async () => {
    const deployTxHash = await deployStateDepositHolder(nodeA, multisigAddress);

    expect(deployTxHash).toBeDefined();
    expect(deployTxHash !== HashZero).toBeTruthy();
  });

  it("can deposit when multisig has not been deployed", async () => {
    const startingMultisigBalance = await provider.getBalance(multisigAddress);
    await deposit(nodeA, multisigAddress, One, nodeB);

    const postDepositMultisigBalance = await provider.getBalance(multisigAddress);

    expect(postDepositMultisigBalance).toBeEq(startingMultisigBalance.add(One));
  });
});
