import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ethers } from "ethers";
import { Pilot, UnipilotVault } from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: UnipilotVault,
  uniswapFactory: Contract,
  baseThreshold: number,
  indexFundAddress: string,
  DAI: Contract,
  USDT: Contract,
  swapRouter: Contract,
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
      await vault.init();
      let lpShares = await vault.deposit(
        wallets[0].address,
        wallets[0].address,
        parseUnits("10", "18"),
        parseUnits("10", "18"),
      );

      const lpBalance = await vault.balanceOf(wallets[0].address);
      console.log("lpBalance", lpBalance);

      const pilotBalance = await DAI.balanceOf(wallets[0].address);
      const usdtBalance = await USDT.balanceOf(wallets[0].address);

      expect(pilotBalance).to.be.equal(parseUnits("3990", "18"));
      expect(usdtBalance).to.be.equal(parseUnits("3990", "18"));
    });

    it("should successfully readjust active vault", async () => {
      await vault.init();
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

    // it("fees compounding for user", async () => {
    //   await vault.deposit(
    //     wallets[0].address,
    //     wallets[0].address,
    //     parseUnits("100", "18"),
    //     parseUnits("100", "18"),
    //   );

    //   const daiBalance = await DAI.balanceOf(wallets[0].address);
    //   const usdtBalance = await USDT.balanceOf(wallets[0].address);

    //   console.log("Balance before swap", daiBalance, usdtBalance);

    //   await swapRouter.connect(wallets[0]).exactInputSingle({
    //     tokenIn: DAI.address,
    //     tokenOut: USDT.address,
    //     fee: 3000,
    //     recipient: wallets[0].address,
    //     deadline: 2000000000, // Wed May 18 2033 03:33:20 GMT+0000
    //     amountIn: parseUnits("50", "18"),
    //     amountOutMinimum: ethers.utils.parseEther("0"),
    //     sqrtPriceLimitX96: 0,
    //   });
    //   await vault.readjustLiquidity();

    //   const daiBalanceAfer = await DAI.balanceOf(wallets[0].address);
    //   const usdtBalanceAfter = await USDT.balanceOf(wallets[0].address);

    //   console.log("Balance after swap", daiBalanceAfer, usdtBalanceAfter);
    //   // await vault.updatePosition();
    //   // const feesData = await vault.getPositionDetails();

    //   // const indexFund = await vault.getVaultInfo();
    //   // const daiBalance = await DAI.balanceOf(indexFund[2]);
    //   // const usdtBalance = await USDT.balanceOf(indexFund[2]);
    //   // expect(daiBalance).to.be.gt(parseUnits("0", "18"));
    //   // expect(usdtBalance).to.be.gt(parseUnits("0", "18"));
    // });
  });
}
