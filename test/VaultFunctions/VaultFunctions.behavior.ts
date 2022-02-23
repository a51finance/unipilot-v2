import { parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, Contract, ethers } from "ethers";
import { Pilot, UnipilotPassiveVault } from "../../typechain";
import { shouldBehaveLikeTokenApproval } from "../TokenApproval/tokenApprove.behavior";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeVaultFunctions(
  wallets: SignerWithAddress[],
  vault: UnipilotPassiveVault,
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
      const daiMintedOnWallet0 = parseUnits("2000000", "18");
      const mintedDaiOnUniswap = parseUnits("5000", "18");
      const daiReserve = parseUnits("5000", "18");
      const daiRatio = mintedDaiOnUniswap.div(daiReserve);
      const expectedDaiBalanceBeforeDeposit = daiMintedOnWallet0.sub(daiRatio);
      const expectedDaiBalanceAfterDeposit =
        expectedDaiBalanceBeforeDeposit.sub(
          parseUnits("1000", "18").div(daiReserve),
        );

      const usdtMintedOnWallet0 = parseUnits("2000000", "18");
      const mintedUsdtOnUniswap = parseUnits("5000", "18");
      const usdtReserve = parseUnits("5000", "18");
      const usdtRatio = mintedUsdtOnUniswap.div(daiReserve);
      const expectedUsdtBalanceBeforeDeposit =
        usdtMintedOnWallet0.sub(usdtRatio);
      const expectedUsdtBalanceAfterDeposit =
        expectedUsdtBalanceBeforeDeposit.sub(
          parseUnits("1000", "18").div(usdtReserve),
        );

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

      expect(lpBalance).to.be.equal(parseUnits("1000", "18"));

      const daiBalance = await DAI.balanceOf(wallets[0].address);
      const usdtBalance = await USDT.balanceOf(wallets[0].address);

      console.log("after first deposit balance", daiBalance, usdtBalance);
      expect(daiBalance).to.be.equal(expectedDaiBalanceAfterDeposit);
      expect(usdtBalance).to.be.equal(expectedUsdtBalanceAfterDeposit);
    });

    it("should successfully readjust active vault", async () => {
      expect(await vault.readjustLiquidity()).to.be.ok;
    });

    // it("fees compounding for user", async () => {
    //   await vault.deposit(parseUnits("3000", "18"), parseUnits("3000", "18"));

    //   await generateFeeThroughSwap(swapRouter, wallets[0], DAI, USDT, "10000");
    //   const fees = await vault.callStatic.getPositionDetails();
    //   const fees0 = fees[2];
    //   const fees1 = fees[3];

    //   const percentageOfFees0Collected = fees0
    //     .mul(parseInt("10"))
    //     .div(parseInt("100"));

    //   const percentageOfFees1Collected = fees1
    //     .mul(parseInt("10"))
    //     .div(parseInt("100"));

    //   console.log("percentageOfFeesCollected", percentageOfFees0Collected);
    //   await vault.readjustLiquidity();

    //   const indexFund = wallets[1].address;
    //   console.log("index fund address", indexFund);
    //   const daiBalance = await DAI.balanceOf(indexFund);
    //   const usdtBalance = await USDT.balanceOf(indexFund);

    //   expect(percentageOfFees0Collected).to.be.equal(daiBalance);
    //   expect(percentageOfFees1Collected).to.be.equal(usdtBalance);
    // });

    // it("fees calculations in indexfund", async () => {
    //   const positionDetails = await vault.callStatic.getPositionDetails();
    //   console.log("positionDetails", positionDetails);
    //   const vaultDai = await DAI.balanceOf(vault.address);
    //   console.log("vaultDai", vaultDai);
    //   const actualDeposit = await vault.callStatic.deposit(
    //     parseUnits("3000", "18"),
    //     parseUnits("3000", "18"),
    //   );

    //   console.log("actualDeposit", actualDeposit);

    //   await vault.deposit(parseUnits("3000", "18"), parseUnits("3000", "18"));
    //   await generateFeeThroughSwap(swapRouter, wallets[0], DAI, USDT, "2000");
    //   const fees = await vault.callStatic.getPositionDetails();
    //   console.log("after swap position detail", fees);
    //   const fees0 = fees[2];
    //   const fees1 = fees[3];

    //   const percentageOfFees0Collected = fees0
    //     .mul(parseInt("10"))
    //     .div(parseInt("100"));

    //   const percentageOfFees1Collected = fees1
    //     .mul(parseInt("10"))
    //     .div(parseInt("100"));

    //   console.log("percentageOfFeesCollected", percentageOfFees0Collected);
    //   await vault.readjustLiquidity();

    //   const indexFund = wallets[1].address;
    //   console.log("index fund address", indexFund);
    //   const daiBalance = await DAI.balanceOf(indexFund);
    //   const usdtBalance = await USDT.balanceOf(indexFund);

    //   expect(percentageOfFees0Collected).to.be.equal(daiBalance);
    //   expect(percentageOfFees1Collected).to.be.equal(usdtBalance);
    // });

    // it("should successfully withdraw from active vault", async () => {
    //   const daiBalanceBeforeWithdraw = await DAI.balanceOf(wallets[0].address);
    //   const usdtBalanceBeforeWithdraw = await USDT.balanceOf(
    //     wallets[0].address,
    //   );
    //   console.log("daiBalanceBeforeWithdraw", daiBalanceBeforeWithdraw);
    //   console.log("usdtBalanceBeforeWithdraw", usdtBalanceBeforeWithdraw);

    //   const lpBalanceOfUserBeforeWithdraw = await vault.balanceOf(
    //     wallets[0].address,
    //   );
    //   console.log("lpBalance", lpBalanceOfUserBeforeWithdraw);
    //   const withdrawActual = await vault.callStatic.withdraw(
    //     lpBalanceOfUserBeforeWithdraw,
    //     wallets[0].address,
    //   );
    //   console.log("withdrawActual", withdrawActual);
    //   expect(
    //     await vault.withdraw(lpBalanceOfUserBeforeWithdraw, wallets[0].address),
    //   ).to.be.ok;
    //   const daiBalanceAfterWithdraw = await DAI.balanceOf(wallets[0].address);
    //   const usdtBalanceAfterWithdraw = await USDT.balanceOf(wallets[0].address);
    //   console.log("daiBalanceAfterWithdraw", daiBalanceAfterWithdraw);
    //   console.log("usdtBalanceAfterWithdraw", usdtBalanceAfterWithdraw);

    //   console.log(
    //     "total dai that was deposited",
    //     daiBalanceAfterWithdraw - daiBalanceBeforeWithdraw,
    //   );
    //   console.log(
    //     "total usdt that was deposited",
    //     usdtBalanceAfterWithdraw - usdtBalanceBeforeWithdraw,
    //   );
    //   const lpBalanceOfUserAfterWithdraw = await vault.balanceOf(
    //     wallets[0].address,
    //   );
    //   expect(lpBalanceOfUserAfterWithdraw).to.be.equal(0);
    //   // expect(daiBalanceAfterWithdraw).to.gte()
    // });
  });
}
