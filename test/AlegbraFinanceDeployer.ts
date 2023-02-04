import { Signer, Contract } from "ethers";
import { ethers } from "hardhat";


export class AlgeraFinanceDeployer {
  static async deploy(
    actor: Signer,
    weth9: Contract,
  ): Promise<{ [name: string]: Contract }> {
    const vaultAddress = "0x1d8b6fA722230153BE08C4Fa4Aa4B4c7cd01A95a";
    const deployer = new AlgeraFinanceDeployer(actor);
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
  }
  async deployFactory(poolDeployerAddress: string, vaultAddress: string) {
    const factory = await ethers.getContractFactory("AlgebraFactory");
    const f = await factory.deploy(poolDeployerAddress, vaultAddress);

    return f;
  }

  async deployRouter(
    factoryAddress: string,
    pooldeployer: string,
    weth9Address: string,
  ) {
    const router1 = await ethers.getContractFactory(
      "contracts/test/periphery/SwapRouter.sol:SwapRouter",
    );
    const router = await router1.deploy(
      factoryAddress,
      weth9Address,
      pooldeployer,
    );
    return router;
  }

  async deployNFTDescriptorLibrary() {
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
}
