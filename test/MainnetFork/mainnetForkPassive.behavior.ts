const hre = require("hardhat");

import { expect } from "chai";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { encodePriceSqrt } from "../utils/encodePriceSqrt";
import {
  UniswapV3Pool,
  NonfungiblePositionManager,
  UnipilotPassiveVault,
  UnipilotPassiveFactory,
} from "../../typechain";
import ERC20Artifact from "../../artifacts/contracts/test/ERC20.sol/ERC20.json";
import WETH9Artifact from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
import { deployPassiveFactory, deployStrategy } from "../stubs";

export async function shouldBehaveLikePassiveLive(): Promise<void> {
  const createFixtureLoader = waffle.createFixtureLoader;
  let uniswapV3Factory: Contract;
  let uniswapV3PositionManager: NonfungiblePositionManager;
  let uniStrategy: Contract;
  let unipilotFactory: UnipilotPassiveFactory;
  let swapRouter: Contract;
  // let unipilotVault: UnipilotActiveVault;
  // let shibPilotVault: UnipilotActiveVault;
  let daiWeth: ContractFactory;
  let unipilotVault: UnipilotPassiveVault;
  let daiWethVault: string;
  let SHIB: Contract;
  let PILOT: Contract;
  let DAI: Contract;
  let WETH: Contract;
  let USDT: Contract;
  let daiUsdtUniswapPool: UniswapV3Pool;
  let shibPilotUniswapPool: UniswapV3Pool;
  let owner: any;

  const encodedPrice = encodePriceSqrt(
    parseUnits("1", "18"),
    parseUnits("8", "18"),
  );

  beforeEach("Fork Begin", async () => {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.FORK}`,
            blockNumber: 14409239,
          },
        },
      ],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x0000000000000000000000000000000000000001"],
    });
    //Hacker 0xB3764761E297D6f121e79C32A65829Cd1dDb4D32
    owner = await ethers.getSigner(
      "0x0000000000000000000000000000000000000001",
    );

    DAI = await ethers.getContractAt(
      ERC20Artifact.abi,
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    );
    WETH = await ethers.getContractAt(
      WETH9Artifact.abi,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    );

    uniStrategy = await deployStrategy(owner);
    unipilotFactory = await deployPassiveFactory(
      owner,
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      owner.address,
      uniStrategy.address,
      owner.address,
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "10",
      "10",
    );

    await unipilotFactory.connect(owner).createVault(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      // "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", //dai
      "3000",
      encodedPrice,
      "WBTC-WETH-3000",
      "WBTC-WETH",
    );

    daiWethVault = await unipilotFactory.vaults(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "3000",
    );

    daiWeth = await ethers.getContractFactory("UnipilotPassiveVault");
    unipilotVault = daiWeth.attach(daiWethVault) as UnipilotPassiveVault;
    // daiWeth = await ethers.getContractAt(
    //   UnipilotPassiveVaultArtifact.abi,
    //   daiWethVault,
    // );

    await DAI.connect(owner).approve(unipilotVault.address, MaxUint256);
    await WETH.connect(owner).approve(unipilotVault.address, MaxUint256);
  });

  it("Mainnet Deployments Test", async () => {
    const walletBalancePrior = await ethers.provider.getBalance(owner.address);
    let Dai = await DAI.connect(owner).balanceOf(owner.address);
    console.log("Dai bal", Dai);
    console.log("Balance Of signer is: ", walletBalancePrior);

    console.log("uniStrategy", uniStrategy.address);
    console.log("unipilotFactory", unipilotFactory.address);

    console.log("daiWeth vault", daiWethVault);
  });
  it("Should be deposit", async () => {
    let tx = await unipilotVault
      .connect(owner)
      .deposit(parseUnits("2805", "18"), parseUnits("1", "18"), owner.address, {
        value: parseUnits("1", "18"),
      });
    console.log("Tx hash", tx.hash);
  });
}
