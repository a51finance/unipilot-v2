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
import { MaxUint256 } from "@ethersproject/constants";
import hre from "hardhat";

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
  describe("Testing the UnipilotFactory !!", async () => {
    shouleBehaveLikePilotFactory(
      wallets,
      UnipilotFactory,
      UniswapV3Factory,
      USDT,
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
      let [wallet0, wallet1] = await hre.ethers.getSigners();

      ({ unipilotFactory, createVault } = await loadFixture(
        unipilotVaultFixture,
      ));

      unipilotVault = await createVault(
        USDT.address,
        PILOT.address,
        3000,
        "79228162514264337593543950336",
        "unipilot PILOT-WETH",
        "PILOT-WETH",
      );
      // await unipilotFactory
      //   .connect(wallet0)
      //   .whitelistVaults([unipilotVault.address]);

      //following ERC20Artifact
      await USDT._mint(wallets[0].address, parseUnits("20", "18"));

      //following PilotArtifact
      await PILOT.mint(wallets[0].address, parseUnits("20", "18"));

      console.log(
        "USDT Balance of wallet 0",
        await USDT.balanceOf(wallets[0].address),
      );
      console.log(
        "PILOT Balance of wallet 0",
        await PILOT.balanceOf(wallets[0].address),
      );

      await USDT.connect(wallets[0]).approve(unipilotVault.address, MaxUint256);

      await PILOT.connect(wallets[0]).approve(
        unipilotVault.address,
        MaxUint256,
      );

      const allowanceUsdt = await USDT.allowance(
        wallets[0].address,
        unipilotVault.address,
      );
      console.log("allowance of USDT", allowanceUsdt);

      const allowancePilot = await PILOT.allowance(
        wallets[0].address,
        unipilotVault.address,
      );
      console.log("allowance of PILOT", allowancePilot);
    });

    it("Router Function to be executed", async () => {
      await shouldBehaveLikeUnipilotRouterFunctions(
        wallets,
        UnipilotFactory,
        UnipilotRouter,
        PILOT,
        USDT,
      );
    });

    it("Vault functions to be executed", async () => {
      await shouldBehaveLikeVaultFunctions(
        wallets,
        unipilotVault,
        UniswapV3Factory,
        20,
        wallets[0].address,
        PILOT,
        USDT,
      );
    });
  });
}
