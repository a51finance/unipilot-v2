import { use } from "chai";
import { solidity } from "ethereum-waffle";

import { shouldBehaveLikeDepositActive } from "./DepositActive/depositActive.behavior";
import { shouldBehaveLikeDepositPassive } from "./DepositPassive/depositPassive.behavior";
import { shouldBehaveLikeUnipilotFactory } from "./UnipilotFactoryFunctions/UnipilotFactory.behavior";

use(solidity);

describe("Invokes Deposit Active Tests", async () => {
  await shouldBehaveLikeDepositActive();
});

describe("Invokes Deposit Passive Tests", async () => {
  await shouldBehaveLikeDepositPassive();
});

describe("Invokes Unipilot Factory Tests", async () => {
  await shouldBehaveLikeUnipilotFactory();
});
