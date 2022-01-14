import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ethers } from "ethers";
import { Pilot, UnipilotVault } from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: UnipilotVault,
  uniswapFactory: Contract,
  baseThreshold: number,
  indexFundAddress: string,
  DAI: Contract,
  USDT: Contract,
  swapRouter: Contract,
  uniswapPool: Contract,
): Promise<void> {
  // it("should fail depoit with IL", async () => {
  //   await expect(
  //     vault.deposit(
  //       wallets[0].address,
  //       wallets[0].address,
  //       0,
  //       parseUnits("2", "18"),
  //     ),
  //   ).to.be.revertedWith("IL");
  // });

  describe("Testing Unipilot Vault", async () => {
    it("checking name of vault LP Token", async () => {
      const vaultName = (await vault.name()).toString();
      console.log("Vault name", vaultName);
      expect(vaultName).to.be.equal("unipilot PILOT-USDT");
    });

    it("checking name of vault LP Token", async () => {
      const vaultSymbol = (await vault.symbol()).toString();
      console.log("Vault symbol", vaultSymbol);
      expect(vaultSymbol).to.be.equal("PILOT-USDT");
    });

    it("checking name of vault LP Token", async () => {
      const totalSupply = (await vault.totalSupply()).toString();
      console.log("Vault total Supply", totalSupply);
      expect(totalSupply).to.be.equal("0");
    });

    it("should give user balance of pilot and usdt before deposit", async () => {
      const pilotBalance = await DAI.balanceOf(wallets[0].address);
      const usdtBalance = await USDT.balanceOf(wallets[0].address);

      console.log("Pilot balance", pilotBalance);
      console.log("Usdt balance", usdtBalance);
    });

    it("should successfully deposit liquidity", async () => {
      const uniswapPool = await vault.getVaultInfo();
      console.log("uniswapPool in deposit", uniswapPool);
      const resultDeposit = await vault
        .connect(wallets[0])
        .callStatic.deposit(parseUnits("1000", "18"), parseUnits("1000", "18"));
      console.log("resultDeposit", resultDeposit);
      expect(
        await vault
          .connect(wallets[0])
          .deposit(parseUnits("1000", "18"), parseUnits("1000", "18")),
      ).to.be.ok;

      const lpBalance = await vault.balanceOf(wallets[0].address);
      console.log("lpBalance", lpBalance);

      const daiBalance = await DAI.balanceOf(wallets[0].address);
      const usdtBalance = await USDT.balanceOf(wallets[0].address);

      console.log("pilot balance", daiBalance, usdtBalance);
      // expect(daiBalance).to.be.equal(parseUnits("3000", "18"));
      // expect(usdtBalance).to.be.equal(parseUnits("3000", "18"));
    });

    it("should successfully readjust active vault", async () => {
      expect(await vault.readjustLiquidity()).to.be.ok;
      const daiBalance = await DAI.balanceOf(vault.address);
      const usdtBalance = await USDT.balanceOf(vault.address);
      const indexFund = await vault.getVaultInfo();

      // expect(daiBalance).to.be.equal(parseUnits("0", "18"));
      // expect(usdtBalance).to.be.equal(parseUnits("0", "18"));
      // const indexFundDai = await DAI.balanceOf(indexFund[2]);
      // const indexFundUsdt = await USDT.balanceOf(indexFund[2]);
      // expect(indexFundDai).be.equal(parseUnits("0", "18"));
      // expect(indexFundUsdt).be.equal(parseUnits("0", "18"));
    });

    // it("should successfully withdraw from active vault", async () => {
    //   expect(await vault.withdraw(parseUnits("10", "18"), wallets[0].address))
    //     .to.be.ok;
    //   const daiBalance = await DAI.balanceOf(wallets[0].address);
    //   const usdtBalance = await USDT.balanceOf(wallets[0].address);
    //   expect(daiBalance).to.be.gt(parseUnits("3999", "18"));
    //   expect(usdtBalance).to.be.gt(parseUnits("3999", "18"));
    // });

    it("fees compounding for user", async () => {
      await vault.deposit(parseUnits("3000", "18"), parseUnits("3000", "18"));

      await generateFeeThroughSwap(swapRouter, wallets[0], DAI, USDT, "10000");
      const fees = await vault.callStatic.getPositionDetails();
      const fees0 = fees[2];
      const fees1 = fees[3];

      const percentageOfFees0Collected = fees0
        .mul(parseInt("10"))
        .div(parseInt("100"));

      const percentageOfFees1Collected = fees1
        .mul(parseInt("10"))
        .div(parseInt("100"));

      console.log("percentageOfFeesCollected", percentageOfFees0Collected);
      await vault.readjustLiquidity();

      const indexFund = wallets[1].address;
      console.log("index fund address", indexFund);
      const daiBalance = await DAI.balanceOf(indexFund);
      const usdtBalance = await USDT.balanceOf(indexFund);

      expect(percentageOfFees0Collected).to.be.equal(daiBalance);
      expect(percentageOfFees1Collected).to.be.equal(usdtBalance);

      // expect(daiBalance).to.be.gt(parseUnits("0", "18"));
      // expect(usdtBalance).to.be.gt(parseUnits("0", "18"));
    });
  });
}
