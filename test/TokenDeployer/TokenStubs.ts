import { Signer } from "@ethersproject/abstract-signer";
import { parseUnits } from "@ethersproject/units";
import { deployContract } from "ethereum-waffle";
import { Contract } from "ethers";
import Erc20Artifact from "../../artifacts/contracts/test/ERC20.sol/ERC20.json";
import PilotArtifact from "../../artifacts/contracts/test/PilotToken.sol/Pilot.json";
export async function deployToken(
  deployer: any,
  name: String,
  symbol: String,
  decimal: any,
): Promise<Contract> {
  let token = await deployContract(deployer, Erc20Artifact, [
    name,
    symbol,
    decimal,
  ]);
  return token;
}

export async function deployPilot(deployer: any): Promise<Contract> {
  let pilot = await deployContract(deployer, PilotArtifact, [
    deployer.address,
    [deployer.address],
    [parseUnits("50000", "18")],
  ]);
  return pilot;
}
