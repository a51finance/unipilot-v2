import { MaxUint256 } from "@ethersproject/constants";
import { ethers } from "hardhat";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { Bytes, formatUnits, parseUnits, AbiCoder } from "ethers/lib/utils";
import { Signer, Wallet } from "ethers";
import "@nomiclabs/hardhat-ethers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

import UnipilotFactoryArtifacts from "../artifacts/contracts/UnipilotFactory.sol/UnipilotFactory.json";

dotenvConfig({ path: resolve(__dirname, "../.env") });

const web3 = new Web3(process.env.INFURA_URL!);

const contractUnipilotFactory = new web3.eth.Contract(
  UnipilotFactoryArtifacts.abi as AbiItem[],
  "0xcE8f9628aD97D45ee6B7088ccd316D11B37cce71",
);

let wallet: Signer;
let wallet2: Signer;
let privateKey: any = process.env.PK1;
let privateKey2: any = process.env.PK2;

async function updateStateVariables(): Promise<void> {
  const _wallet = await ethers.getSigners();
  wallet = _wallet[0];
  // wallet = wallet1;
}

async function updateStateVariables2(): Promise<void> {
  const _wallet = await ethers.getSigners();
  wallet2 = _wallet[1];
}

const deployUnipilotFactory = async () => {
  const UnipilotFactory = new ethers.ContractFactory(
    UnipilotFactoryArtifacts.abi,
    UnipilotFactoryArtifacts.bytecode,
    wallet,
  );
  const UnipilotFactoryContract = await UnipilotFactory.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  );
  const walletAddress = await wallet.getAddress();
  console.log(
    "UnipilotFactory deployed to:",
    UnipilotFactoryContract.address,
    "from account,",
    walletAddress,
  );
};

const deployVault = async (
  contractAddress: string,
  amount: string,
  tokenAddress: string,
) => {
  const tokenContract = new ethers.ContractFactory(
    UnipilotFactoryArtifacts.abi,
    UnipilotFactoryArtifacts.bytecode,
    wallet2,
  );
};

const checkGovernance = async (contractAddress: string) => {
  const uniPilotFactoryContract = new ethers.ContractFactory(
    UnipilotFactoryArtifacts.abi,
    UnipilotFactoryArtifacts.bytecode,
    wallet,
  );
  const unipilotFactoryInstance =
    uniPilotFactoryContract.attach(contractAddress);
  const owner = await unipilotFactoryInstance.owner();
  console.log("Owner of Unipilot Factory", owner);
};

const main = async () => {
  await updateStateVariables();
  await updateStateVariables2();
  // await deployUnipilotFactory();
  await checkGovernance("0xcE8f9628aD97D45ee6B7088ccd316D11B37cce71");
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
