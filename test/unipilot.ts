import { use } from "chai";
import { solidity } from "ethereum-waffle";

import { shouldBehaveLikeDepositActive } from "./DepositActive/depositActive.behavior";
import { shouldBehaveLikeRebalanceActive } from "./RebalanceActive/rebalanceActive.behavior";
import { shouldBehaveLikeDepositPassive } from "./DepositPassive/depositPassive.behavior";
import { shouldBehaveLikeUnipilotFactory } from "./UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeWithdraw } from "./Withdraw/withdraw.behavior";

use(solidity);

// describe("Invokes Deposit Active Tests", async () => {
//   await shouldBehaveLikeDepositActive();
// });

// describe("Invokes Rebalance Active Tests", async () => {
//   await shouldBehaveLikeRebalanceActive();
// });
// describe("Invokes Unipilot Factory Tests", async () => {
//   await shouldBehaveLikeUnipilotFactory();
// })

describe("Withdraw Liquidity", async () => {
  await shouldBehaveLikeWithdraw();
});
