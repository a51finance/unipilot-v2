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
import UnipilotVaultArtifacts from "../artifacts/contracts/UnipilotVault.sol/UnipilotVault.json";
import UnipilotStrategyArtifacts from "../artifacts/contracts/UnipilotStrategy.sol/UnipilotStrategy.json";
import ERC20Artifact from "../artifacts/contracts/test/ERC20.sol/ERC20.json";

dotenvConfig({ path: resolve(__dirname, "../.env") });

const web3 = new Web3(process.env.INFURA_URL!);
const UnipilotStrategy = "0x3DB63a880FFaED0aBfA40496366fcc383256ecCA";

const contractUnipilotFactory = new web3.eth.Contract(
  UnipilotFactoryArtifacts.abi as AbiItem[],
  "0xcE8f9628aD97D45ee6B7088ccd316D11B37cce71",
);

let wallet: Signer;
let wallet2: Signer;
let privateKey: any = process.env.PK1;
let privateKey2: any = process.env.PK2;

const DAI_TOKEN_ADDRESS = "0xc7ad46e0b8a400bb3c915120d284aafba8fc4735";
const USDT_TOKEN_ADDRESS = "0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02";
const USDC_TOKEN_ADDRESS = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b";
const WETH_TOKEN_ADDRESS = "0xc778417e063141139fce010982780140aa0cd5ab";
const TKN1_TOKEN_ADDRESS = "0x6df730f6e52c57be77db98a65116d2c38ec2be2b"; // DST
const TKN2_TOKEN_ADDRESS = "0xdf98809bbaee8d72ba88a80bc99308e30e04e4ab";
const TTC33 = "0xB6118140b5Ad8A1449D1FeF850dA49eE4677D77A";
const TTC99 = "0xEc025986c17b4476dB7D3F3A6065f757C56f9CAe";
const pool = "0x2c028E572c5e8708aA6264a0E87396e36E477DD0"; // TTCC99 & TKN5

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
  const walletAddress = await wallet.getAddress();
  const UnipilotFactoryContract = await UnipilotFactory.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    walletAddress,
    "0x0000000000000000000000000000000000000000",
    UnipilotStrategy,
  );
  console.log(
    "UnipilotFactory deployed to:",
    UnipilotFactoryContract.address,
    "from account,",
    walletAddress,
  );
};

const deployUnipilotStrategy = async () => {
  const UnipilotFactory = new ethers.ContractFactory(
    UnipilotStrategyArtifacts.abi,
    UnipilotStrategyArtifacts.bytecode,
    wallet,
  );

  const walletAddress = await wallet.getAddress();
  const UnipilotStrategy = await UnipilotFactory.deploy(walletAddress);

  console.log(
    "UnipilotStrategy deployed to:",
    UnipilotStrategy.address,
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

async function getERC20Approval(
  tokenAddress: string,
  spenderAddress: string,
): Promise<void> {
  const tokenContract = new ethers.ContractFactory(
    ERC20Artifact.abi,
    ERC20Artifact.bytecode,
    wallet,
  );

  const tokenContractInstance = tokenContract.attach(tokenAddress);

  const approval = await tokenContractInstance.approve(
    spenderAddress,
    MaxUint256,
    {
      gasLimit: "10000000",
      gasPrice: "13535202943",
    },
  );
  console.log("getERC20Approval -> ", approval.hash);
}

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
  //await deployUnipilotStrategy();
  await getERC20Approval(
    TKN2_TOKEN_ADDRESS,
    "0x4191F471c8c4040E02af59bE476aa5EFD870783F",
  );
  await getERC20Approval(TTC99, "0x4191F471c8c4040E02af59bE476aa5EFD870783F");
  // await checkGovernance("0xcE8f9628aD97D45ee6B7088ccd316D11B37cce71");
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
