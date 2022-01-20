import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import {
  getMaxTick,
  getMinTick,
  unipilotVaultFixture,
} from "../utils/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotVault,
} from "../../typechain";
import { generateFeeThroughSwap } from "../utils/SwapFunction/swap";

export async function shouldBehaveLikeRebalanceActive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let swapRouter: Contract;
  let unipilotVault: UnipilotVault;
  let shibPilotVault: UnipilotVault;
  let SHIB: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let USDT: Contract;
  let daiUsdtUniswapPool: UniswapV3Pool;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });

  beforeEach("setting up fixture contracts", async () => {
    ({
      uniswapV3Factory,
      swapRouter,
      unipilotFactory,
      DAI,
      USDT,
      PILOT,
      SHIB,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotVaultFixture));

    await uniswapV3Factory.createPool(DAI.address, USDT.address, 3000);
    let daiUsdtPoolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      3000,
    );

    daiUsdtUniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      daiUsdtPoolAddress,
    )) as UniswapV3Pool;

    await daiUsdtUniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([daiUsdtPoolAddress], [1800]);

    unipilotVault = await createVault(
      USDT.address,
      DAI.address,
      3000,
      encodedPrice,
      "unipilot PILOT-USDT",
      "PILOT-USDT",
    );

    await unipilotFactory
      .connect(wallet)
      .whitelistVaults([unipilotVault.address]);

    await USDT._mint(wallet.address, parseUnits("2000000", "18"));
    await DAI._mint(wallet.address, parseUnits("2000000", "18"));
    await SHIB._mint(wallet.address, parseUnits("2000000", "18"));
    await PILOT._mint(wallet.address, parseUnits("2000000", "18"));
    await SHIB._mint(alice.address, parseUnits("2000000", "18"));
    await PILOT._mint(alice.address, parseUnits("2000000", "18"));

    await USDT.connect(wallet).approve(unipilotVault.address, MaxUint256);
    await DAI.connect(wallet).approve(unipilotVault.address, MaxUint256);

    await USDT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await DAI.connect(wallet).approve(swapRouter.address, MaxUint256);
    await SHIB.connect(wallet).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(wallet).approve(swapRouter.address, MaxUint256);
    await SHIB.connect(alice).approve(swapRouter.address, MaxUint256);
    await PILOT.connect(alice).approve(swapRouter.address, MaxUint256);
  });

  it("rebalance with 50/50", async () => {
    const pilotBalanceBeforeDeposit: BigNumber = await PILOT.balanceOf(
      wallet.address,
    );

    const shibBalanceBeforeDeposit: BigNumber = await SHIB.balanceOf(
      wallet.address,
    );

    const shibMintedOnWallet = parseUnits("2000000", "18");
    const pilotMintedOnWallet = parseUnits("2000000", "18");

    await shibPilotVault.init();
    const a = await shibPilotVault
      .connect(wallet)
      .callStatic.deposit(parseUnits("10000", "18"), parseUnits("80000", "18"));

    console.log("deposited", a);
    await shibPilotVault
      .connect(wallet)
      .deposit(parseUnits("10000", "18"), parseUnits("80000", "18"));

    const lpBalance: BigNumber = await shibPilotVault
      .connect(wallet)
      .balanceOf(wallet.address);

    await generateFeeThroughSwap(swapRouter, alice, PILOT, SHIB, "2000");

    const calculatedFees = await parseUnits("2000", "18")
      .mul(parseUnits("0.3", "18"))
      .div(parseUnits("100", "18"));

    console.log("calculated fees", calculatedFees);
    const fees = await shibPilotVault.callStatic.getPositionDetails();
    console.log("feeses", fees);

    expect(fees[2]).to.be.equal(calculatedFees.div(parseUnits("1", "18")));

    const withdrawFunds = await shibPilotVault.callStatic.withdraw(
      lpBalance,
      wallet.address,
    );
    console.log("withdrawFunds", withdrawFunds);

    await shibPilotVault.withdraw(lpBalance, wallet.address);

    const newPilotBalance: BigNumber = await PILOT.balanceOf(wallet.address);
    const newShibBalance: BigNumber = await SHIB.balanceOf(wallet.address);

    console.log("newPilotBalance", newPilotBalance);
    console.log("newShibBalance", newShibBalance);

    const pilotBalanceAfterWithdraw =
      pilotBalanceBeforeDeposit.add(calculatedFees);

    expect(newPilotBalance).to.be.equal(pilotBalanceAfterWithdraw);
    expect(newShibBalance).to.be.equal(shibBalanceBeforeDeposit);
  });
}
