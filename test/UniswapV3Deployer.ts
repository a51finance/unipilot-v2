import { Signer, Contract, ContractFactory } from "ethers";
import { linkLibraries } from "./utils/linklibraries";
import WETH from "uniswap-v3-deploy-plugin/src/util/WETH9.json";
//import { AlgebraPoolDeployer, SwapRouter,AlgebraFactory,NFTDescriptor, NonfungibleTokenPositionDescriptor  } from "../typechain";
import { ethers } from "hardhat";
import { string } from "hardhat/internal/core/params/argumentTypes";
import console from "console";
type ContractJson = { abi: any; bytecode: string };
const artifacts: { [name: string]: ContractJson } = {
  // PoolDeployer: require("@cryptoalgebra/core/artifacts/contracts/AlgebraPoolDeployer.sol/AlgebraPoolDeployer.json"),
  // UniswapV3Factory: require("@cryptoalgebra/core/artifacts/contracts/AlgebraFactory.sol/AlgebraFactory.json"),
  // SwapRouter: require("@cryptoalgebra/periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
  // NFTDescriptor: require("@cryptoalgebra/periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json"),
  // NonfungibleTokenPositionDescriptor: require("@cryptoalgebra/periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json"),
  //NonfungiblePositionManager: require("@cryptoalgebra/periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
  // PoolDeployer: AlgebraPoolDeployer
  // UniswapV3Factory:
  // SwapRouter:
  // NFTDescriptor:
  // NonfungibleTokenPositionDescriptor:
  // NonfungiblePositionManager:
  // WETH,
};

// TODO: Should replace these with the proper typechain output.
// type INonfungiblePositionManager = Contract;
// type IUniswapV3Factory = Contract;

export class UniswapV3Deployer {
  static async deploy(
    actor: Signer,
    weth9: Contract,
  ): Promise<{ [name: string]: Contract }> {
    const vaultAddress = "0x1d8b6fA722230153BE08C4Fa4Aa4B4c7cd01A95a";
    const deployer = new UniswapV3Deployer(actor);
    const pooldeployer = await deployer.deployPoolDeployer();
    const factory = await deployer.deployFactory(
      pooldeployer.address,
      vaultAddress,
    );
    const router = await deployer.deployRouter(
      factory.address,
      pooldeployer.address,
      weth9.address,
    );
    const nftDescriptorLibrary = await deployer.deployNFTDescriptorLibrary();
    const positionDescriptor = await deployer.deployPositionDescriptor(
      weth9.address,
      nftDescriptorLibrary.address,
    );
    const positionManager = await deployer.deployNonfungiblePositionManager(
      factory.address,
      weth9.address,
      positionDescriptor.address,
      pooldeployer.address,
    );

    return {
      weth9,
      pooldeployer,
      factory,
      router,
      nftDescriptorLibrary,
      positionDescriptor,
      positionManager,
    };
  }

  deployer: Signer;

  constructor(deployer: Signer) {
    this.deployer = deployer;
  }

  async deployPoolDeployer() {
    const poolDep = await ethers.getContractFactory("AlgebraPoolDeployer");
    const p = await poolDep.deploy();

    return p;
    // return await this.deployContract<Contract>(
    //   artifacts.PoolDeployer.abi,
    //   artifacts.PoolDeployer.bytecode,
    //   [],
    //   this.deployer,
    // )
  }
  //const vaultAddress = '0x1d8b6fA722230153BE08C4Fa4Aa4B4c7cd01A95a'
  async deployFactory(poolDeployerAddress: string, vaultAddress: string) {
    const factory = await ethers.getContractFactory("AlgebraFactory");
    const f = await factory.deploy(poolDeployerAddress, vaultAddress);

    return f;
    // return await this.deployContract<Contract>(
    //   artifacts.UniswapV3Factory.abi,
    //   artifacts.UniswapV3Factory.bytecode,
    //   [poolDeployerAddress,vaultAddress],
    //   this.deployer,
    // );
  }

  async deployRouter(
    factoryAddress: string,
    pooldeployer: string,
    weth9Address: string,
  ) {
    // return await this.deployContract<Contract>(
    //   artifacts.SwapRouter.abi,
    //   artifacts.SwapRouter.bytecode,
    //   [factoryAddress, weth9Address,pooldeployer],
    //   this.deployer,
    // );

    const router1 = await ethers.getContractFactory(
      "contracts/test/periphery/SwapRouter.sol:SwapRouter",
    );
    const router = await router1.deploy(
      factoryAddress,
      weth9Address,
      pooldeployer,
    );

    // const sellOrderParams = {
    //   tokenIn: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    //   tokenOut: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    //   recipient: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    //   deadline: Math.round(Date.now() / 1000) + 86400,
    //   amountIn: 18,
    //   amountOutMinimum: 0,
    //   limitSqrtPrice: 0,
    // };
    // await router.exactInputSingle(sellOrderParams)
    return router;
  }

  async deployNFTDescriptorLibrary() {
    // return await this.deployContract<Contract>(
    //   artifacts.NFTDescriptor.abi,
    //   artifacts.NFTDescriptor.bytecode,
    //   [],
    //   this.deployer,
    // );
    const dep = await ethers.getContractFactory(
      "contracts/test/periphery/libraries/NFTDescriptor.sol:NFTDescriptor",
    );
    const NFTDLIB = await dep.deploy();

    return NFTDLIB;
  }

  async deployPositionDescriptor(
    weth9Address: string,
    nftDescriptorLibraryAddress: string,
  ) {
    // const linkedBytecode = linkLibraries(
    //   {
    //     bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
    //     linkReferences: {
    //       "NFTDescriptor.sol": {
    //         NFTDescriptor: [
    //           {
    //             length: 20,
    //             start: 1261,
    //           },
    //         ],
    //       },
    //     },
    //   },
    //   {
    //     NFTDescriptor: nftDescriptorLibraryAddress,
    //   },
    //);

    // return (await this.deployContract(
    //   artifacts.NonfungibleTokenPositionDescriptor.abi,
    //   linkedBytecode,
    //   [weth9Address],
    //   this.deployer,
    // )) as Contract;
    //const Lib =
    const NFTD = await ethers.getContractFactory(
      "contracts/test/periphery/NonfungibleTokenPositionDescriptor.sol:NonfungibleTokenPositionDescriptor",
      {
        libraries: {
          NFTDescriptor: nftDescriptorLibraryAddress,
        },
      },
    );
    return await NFTD.deploy(weth9Address);
  }

  async deployNonfungiblePositionManager(
    factoryAddress: string,
    weth9Address: string,
    positionDescriptorAddress: string,
    pooldeployer: string,
  ) {
    // return await this.deployContract<Contract>(
    //   artifacts.NonfungiblePositionManager.abi,
    //   artifacts.NonfungiblePositionManager.bytecode,
    //   [factoryAddress, weth9Address, positionDescriptorAddress,pooldeployer],
    //   this.deployer,
    // );

    const router1 = await ethers.getContractFactory(
      "contracts/test/periphery/NonfungiblePositionManager.sol:NonfungiblePositionManager",
    );
    const router = await router1.deploy(
      factoryAddress,
      weth9Address,
      positionDescriptorAddress,
      pooldeployer,
    );
    return router;
  }

  private async deployContract<T>(
    abi: any,
    bytecode: string,
    deployParams: Array<any>,
    actor: Signer,
  ) {
    const factory = new ContractFactory(abi, bytecode, actor);
    return await factory.deploy(...deployParams);
  }
}
