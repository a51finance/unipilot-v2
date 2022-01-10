import { deployContract } from "./utils";
import { constants, Wallet } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { task } from "hardhat/config";
import { Bytes, formatUnits, parseUnits, AbiCoder } from "ethers/lib/utils";

task("deploy-unipilot", "Deploy all unipilot contracts")
  .addParam("pool", "UniswapV3 Pool")
  .addParam("governance", "governer address")
  .addParam("name", "Unipilot LP Token name")
  .addParam("symbol", "Unipilot LP Token symbol")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    await run("compile");

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");
    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    const args = {
      pool: cliArgs.pool,
      router: "0x0000000000000000000000000000000000000000",
      strategy: "0x3DB63a880FFaED0aBfA40496366fcc383256ecCA",
      governance: cliArgs.governance,
      unipilotFactory: "0xcFe7AB2AfB8602A08fE6d05095e1ecf3cAf3D924",
      name: cliArgs.name,
      symbol: cliArgs.symbol,
    };

    console.log("Network");
    console.log("   ", network.name);
    console.log("Task Args");
    console.log(args);

    const unipilotVault = await deployContract(
      "UnipilotVault",
      await ethers.getContractFactory("UnipilotVault"),
      signer,
      [
        args.pool,
        args.router,
        args.strategy,
        args.governance,
        args.unipilotFactory,
        args.name,
        args.symbol,
      ],
    );

    await unipilotVault.deployTransaction.wait(5);

    delay(60000);

    await run("verify:verify", {
      address: unipilotVault.address,
      constructorArguments: [
        args.pool,
        args.router,
        args.strategy,
        args.governance,
        args.unipilotFactory,
        args.name,
        args.symbol,
      ],
    });
  });

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
