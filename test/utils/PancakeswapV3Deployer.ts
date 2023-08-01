import { Contract, ContractFactory, Signer } from "ethers";
import {
  NFTDescriptorEx,
  NonfungibleTokenPositionDescriptor,
  PancakeV3Factory,
  PancakeV3PoolDeployer,
  SwapRouter2,
  NonfungiblePositionManager,
} from "../../typechain";
import { linkLibraries } from "./linklibraries";

import PancakeV3PoolDeployerABI from "../../artifacts/contracts/pancake-v3-contracts/projects/v3-core/contracts/PancakeV3PoolDeployer.sol/PancakeV3PoolDeployer.json";
import { ethers } from "hardhat";

type ContractJson = { abi: any; bytecode: string };

const artifacts: { [name: string]: ContractJson } = {
  PancakeV3PoolDeployer: require("../../artifacts/contracts/pancake-v3-contracts/projects/v3-core/contracts/PancakeV3PoolDeployer.sol/PancakeV3PoolDeployer.json"),
  PancakeV3Factory: require("@pancakeswap/v3-core/artifacts/contracts/PancakeV3Factory.sol/PancakeV3Factory.json"),
  SwapRouter: require("@pancakeswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
  NonfungiblePositionManager: require("@pancakeswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
  NFTDescriptor: require("@pancakeswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json"),
  NonfungibleTokenPositionDescriptor: require("@pancakeswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json"),
  NFTDescriptiorEX: require("@pancakeswap/v3-periphery/artifacts/contracts/NFTDescriptorEx.sol/NFTDescriptorEx.json"),
};

export class PancakeswapV3Deployer {
  static async deploy(actor: Signer, weth9: Contract) {
    const deployer = new PancakeswapV3Deployer(actor);

    const pancakeV3PoolDeployer = await deployer.deployPancankeV3PoolDeployer();

    const pancakeswapV3Factory = await deployer.deployFactory(
      pancakeV3PoolDeployer.address,
    );

    await pancakeV3PoolDeployer.setFactoryAddress(pancakeswapV3Factory.address);

    const swapRouter = await deployer.deploySwapRouter(
      pancakeV3PoolDeployer.address,
      pancakeswapV3Factory.address,
      weth9.address,
    );

    const nftDescriptorLibrary = await deployer.deployNFTDescriptorLibrary();

    // const nftDescriptorEX = await deployer.deployNFTDescriptorEX();

    const nftDescriptorExFactory = await ethers.getContractFactory(
      "NFTDescriptorEx",
    );
    const nftDescriptorEx = await nftDescriptorExFactory.deploy();

    const positionDescriptor = await deployer.deployPositionDescriptor(
      weth9.address,
      "0x4554480000000000000000000000000000000000000000000000000000000000",
      nftDescriptorEx.address,
      nftDescriptorLibrary.address,
    );

    // const positionManager = await deployer.deployNonfungiblePositionManager(
    //   pancakeV3PoolDeployer.address,
    //   pancakeswapV3Factory.address,
    //   weth9.address,
    //   positionDescriptor.address,
    // );

    return {
      weth9,
      pancakeV3PoolDeployer,
      pancakeswapV3Factory,
      positionDescriptor,
      swapRouter,
    };
  }

  deployer: Signer;

  constructor(deployer: Signer) {
    this.deployer = deployer;
  }

  async deployPancankeV3PoolDeployer() {
    return (await this.deployContract<Contract>(
      PancakeV3PoolDeployerABI.abi,
      PancakeV3PoolDeployerABI.bytecode,
      [],
      this.deployer,
    )) as PancakeV3PoolDeployer;
  }

  async deployFactory(pancakeV3PoolDeployer: string) {
    return (await this.deployContract<Contract>(
      artifacts.PancakeV3Factory.abi,
      artifacts.PancakeV3Factory.bytecode,
      [pancakeV3PoolDeployer],
      this.deployer,
    )) as PancakeV3Factory;
  }

  async deploySwapRouter(
    deployer: string,
    factoryAddress: string,
    weth9Address: string,
  ) {
    console;
    return (await this.deployContract<Contract>(
      artifacts.SwapRouter.abi,
      artifacts.SwapRouter.bytecode,
      [deployer, factoryAddress, weth9Address],
      this.deployer,
    )) as SwapRouter2;
  }

  async deployNFTDescriptorLibrary() {
    return await this.deployContract<Contract>(
      artifacts.NFTDescriptor.abi,
      artifacts.NFTDescriptor.bytecode,
      [],
      this.deployer,
    );
  }

  async deployNFTDescriptorEX() {
    return await this.deployContract<Contract>(
      artifacts.NFTDescriptiorEX.abi,
      artifacts.NFTDescriptiorEX.bytecode,
      [],
      this.deployer,
    );
  }

  async deployPositionDescriptor(
    weth9Address: string,
    nativeCurrencyLabelBytes: string,
    nftDescriptorEx: string,
    nftDescriptorLibraryAddress: string,
  ) {
    const linkedBytecode = linkLibraries(
      {
        bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
        linkReferences: {
          "NFTDescriptor.sol": {
            NFTDescriptor: [
              {
                length: 20,
                start: 1261,
              },
            ],
          },
        },
      },
      {
        NFTDescriptor: nftDescriptorLibraryAddress,
      },
    );

    return await this.deployContract(
      artifacts.NonfungibleTokenPositionDescriptor.abi,
      linkedBytecode,
      [weth9Address, nativeCurrencyLabelBytes, nftDescriptorEx],
      this.deployer,
    );
  }

  async deployNonfungiblePositionManager(
    v3deployerAddress: string,
    factoryAddress: string,
    weth9Address: string,
    positionDescriptorAddress: string,
  ) {
    return (await this.deployContract<Contract>(
      artifacts.NonfungiblePositionManager.abi,
      artifacts.NonfungiblePositionManager.bytecode,
      [
        v3deployerAddress,
        factoryAddress,
        weth9Address,
        positionDescriptorAddress,
      ],
      this.deployer,
    )) as NonfungiblePositionManager;
  }

  private async deployContract<T>(
    abi: any,
    bytecode: string,
    deployParams: Array<any>,
    actor: Signer,
  ) {
    const factory = new ContractFactory(abi, bytecode, actor);
    return await factory.deploy(...deployParams, {
      gasPrice: 90000000000,
    });
  }
}
