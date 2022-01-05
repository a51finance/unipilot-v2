import { AbiCoder } from "@ethersproject/abi";
import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { createFixtureLoader, loadFixture } from "ethereum-waffle";
import { BigNumber, Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { UnipilotFactory, UnipilotVault } from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";
import { shouleBehaveLikePilotFactory } from "../UnipilotFactoryFunctions/UnipilotFactory.behavior";
import { shouldBehaveLikeUnipilotRouterFunctions } from "../UnipilotRouterFunctions/unipilotRouterFunctions.behavior";
import { unipilotVaultFixture } from "../utils/fixtures";
import { shouldBehaveLikeVaultFunctions } from "../VaultFunctions/VaultFunctions.behavior";

export async function shouldBehaveLikeUnipilotFunctions(
  wallets: SignerWithAddress[],
  UnipilotFactory: Contract,
  // UnipilotVault: Contract,
  UniswapV3Factory: Contract,
  UnipilotRouter: Contract,
  WETH9: Contract,
  PILOT: Contract,
  USDT: Contract,
): Promise<void> {
  // describe("Testing the UnipilotFactory !!", async () => {
  //   shouleBehaveLikePilotFactory(wallets, UnipilotFactory);
  // });
  describe("Testing the UnipilotFactory !!", async () => {
    shouleBehaveLikePilotFactory(
      wallets,
      UnipilotFactory,
      UniswapV3Factory,
      WETH9,
      PILOT,
    );
  });

  // describe("Testing the UnipilotRouter !!", async () => {
  //   shouldBehaveLikeUnipilotRouterFunctions(wallets, UnipilotRouter);
  // });
  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

  describe("Unipilot Vault Skeleton", async () => {
    let loadFixture: ReturnType<typeof createFixtureLoader>;
    let createVault: ThenArg<
      ReturnType<typeof unipilotVaultFixture>
    >["createVault"];
    let unipilotVault: UnipilotVault;
    let wallet: Wallet, other: Wallet;
    let unipilotFactory: UnipilotFactory;

    before("create fixture loader", async () => {
      [wallet, other] = await (ethers as any).getSigners();
      loadFixture = createFixtureLoader([wallet, other]);

      ({ unipilotFactory, createVault } = await loadFixture(
        unipilotVaultFixture,
      ));
      unipilotVault = await createVault(
        WETH9.address,
        PILOT.address,
        3000,
        42951287100,
        "unipilot PILOT-WETH",
        "PILOT-WETH",
      );
    });

    it("Vault functions to be executed", async () => {
      await shouldBehaveLikeVaultFunctions(
        wallets,
        unipilotVault,
        UniswapV3Factory,
        20,
        wallets[0].address,
      );
    });
  });
}
