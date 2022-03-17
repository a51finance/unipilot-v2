import { expect } from "chai";
import { Contract } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { unipilotPassiveVaultFixture } from "../utils/fixturesPassive";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import { UniswapV3Pool, UnipilotPassiveVault } from "../../typechain";
import snapshotGasCost from "../utils/snapshotGasCost";
import { unipilotActiveVaultFixture } from "../utils/fixuresActive";

export async function shouldBehaveLikeUnipilotFactory(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniStrategy: Contract;
  let unipilotFactory: Contract;
  let unipilotVault: UnipilotPassiveVault;
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

  let governance = wallet;

  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let createVault: ThenArg<
    ReturnType<typeof unipilotPassiveVaultFixture>
  >["createVault"];

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });

  beforeEach("setting up fixture contracts", async () => {
    ({
      uniswapV3Factory,
      unipilotFactory,
      DAI,
      USDT,
      uniStrategy,
      createVault,
    } = await loadFixture(unipilotActiveVaultFixture)),
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
  });

  it("Testing Factory : Owner should governor", async () => {
    let data = await unipilotFactory.getUnipilotDetails();
    expect(data[0]).to.equal(governance.address);
  });

  it("Testing Factory : Should revert, set new owner", async () => {
    await expect(
      unipilotFactory.connect(other).setGovernance(other.address),
    ).to.be.revertedWith("NG");
  });

  it("Testing Factory : Should set new owner", async () => {
    let receipt = await unipilotFactory
      .connect(wallet)
      .setGovernance(other.address);
    let data = await unipilotFactory.getUnipilotDetails();
    expect(data[0]).to.equal(other.address);
  });

  it("Testing Factory : Should take gas snapshot of create vault func", async () => {
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 10000);
    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      10000,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);
    await snapshotGasCost(
      await unipilotFactory
        .connect(governance)
        .createVault(
          DAI.address,
          USDT.address,
          10000,
          encodedPrice,
          "unipilot PILOT-USDT",
          "PILOT-USDT",
        ),
    );
  });

  it("Testing Factory : Should create pool with 1% fee tier", async () => {
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 10000);
    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      10000,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        10000,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create pool with 0.05% fee tier", async () => {
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      500,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create pool with 0.05% fee tier", async () => {
    await uniswapV3Factory.createPool(USDT.address, DAI.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      USDT.address,
      DAI.address,
      500,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    const vault = await unipilotFactory
      .connect(governance)
      .createVault(
        USDT.address,
        DAI.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );
    await expect(vault).to.be.ok;
  });

  it("Testing Factory : Should create with 0.3% fee tier but revert (already Exist)", async () => {
    await expect(
      unipilotFactory
        .connect(governance)
        .createVault(
          DAI.address,
          USDT.address,
          3000,
          encodedPrice,
          "unipilot PILOT-USDT",
          "PILOT-USDT",
        ),
    ).to.be.revertedWith("VE");
  });

  it("Testing Factory : Should fail, same token address", async () => {
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      DAI.address,
      500,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    await expect(
      unipilotFactory
        .connect(governance)
        .createVault(
          DAI.address,
          DAI.address,
          500,
          encodedPrice,
          "unipilot PILOT-USDT",
          "PILOT-USDT",
        ),
    ).to.be.revertedWith("TE");
  });

  it("Testing Factory : Pool should not whitelisted but include after run ", async () => {
    await uniswapV3Factory.createPool(DAI.address, USDT.address, 500);

    let poolAddress = await uniswapV3Factory.getPool(
      DAI.address,
      USDT.address,
      500,
    );

    let uniswapPool = (await ethers.getContractAt(
      "UniswapV3Pool",
      poolAddress,
    )) as UniswapV3Pool;

    await uniswapPool.initialize(encodedPrice);

    await uniStrategy.setBaseTicks([poolAddress], [1800]);

    await unipilotFactory
      .connect(governance)
      .createVault(
        DAI.address,
        USDT.address,
        500,
        encodedPrice,
        "unipilot PILOT-USDT",
        "PILOT-USDT",
      );

    let vaults = await unipilotFactory.vaults(DAI.address, USDT.address, 500);

    await unipilotFactory.connect(wallet).whitelistVaults([vaults]);

    const whiteListedVault = await unipilotFactory
      .connect(governance)
      .whitelistedVaults(vaults);
    expect(whiteListedVault).to.be.equals(true);
  });
}
