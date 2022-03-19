import { use } from "chai";
import { solidity } from "ethereum-waffle";

import { shouldBehaveLikeDepositActive } from "./DepositActive/depositActive.behavior";
import { shouldBehaveLikeDepositPassive } from "./DepositPassive/depositPassive.behavior";
import { shouldBehaveLikeRebalancePassive } from "./RebalancePassive/rebalancePassive.behavior";
import { shouldBehaveLikeRebalanceActive } from "./RebalanceActive/rebalanceActive.behavior";
import { shouldBehaveLikeWithdrawPassive } from "./WithdrawPassive/withdrawPassive.behavior";
import { shouldBehaveLikeWithdrawActive } from "./WithdrawActive/withdrawActive.behaviour";
import { shouldBehaveLikePassiveLive } from "./MainnetFork/mainnetForkPassive.behavior";
import { shouldBehaveLikeActiveLive } from "./MainnetFork/mainnetForkActive.behavior";

use(solidity);

// describe("Invokes Deposit Active Tests", async () => {
//   await shouldBehaveLikeDepositActive();
// });

// describe("Invokes Deposit Passive Tests", async () => {
//   await shouldBehaveLikeDepositPassive();
// });

// describe("Invokes Rebalance Active Tests", async () => {
//   await shouldBehaveLikeRebalanceActive();
// });

// describe("Invokes Rebalance Passive Tests", async () => {
//   await shouldBehaveLikeRebalancePassive();
// });

// describe("Withdraw Liquidity for Passive", async () => {
//   await shouldBehaveLikeWithdrawPassive();
// });

// describe("Invoke mainnet state for passive", async () => {
//   await shouldBehaveLikePassiveLive();
// });

describe("Invoke Mainnet State", async () => {
  await shouldBehaveLikeActiveLive();
});
// describe("Withdraw Liquidity for Active", async () => {
//   await shouldBehaveLikeWithdrawActive();
// });
