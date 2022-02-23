import { use } from "chai";
import { solidity } from "ethereum-waffle";

import { shouldBehaveLikeDepositPassive } from "./DepositPassive/depositPassive.behavior";
import { shouldBehaveLikeRebalancePassive } from "./RebalancePassive/rebalancePassive.behavior";
import { shouldBehaveLikeUnipilotFactory } from "./UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeWithdrawPasssive } from "./WithdrawPassive/withdrawPassive.behavior";

use(solidity);

// describe("Invokes Deposit Passive Tests", async () => {
//   await shouldBehaveLikeDepositPassive();
// });

describe("Invokes Rebalance Passive Tests", async () => {
  await shouldBehaveLikeRebalancePassive();
});

// describe("Invokes Unipilot Factory Tests", async () => {
//   await shouldBehaveLikeUnipilotFactory();
// })

describe("Withdraw Liquidity", async () => {
  await shouldBehaveLikeWithdrawPasssive();
});
