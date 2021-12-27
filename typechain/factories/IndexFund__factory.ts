/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { IndexFund, IndexFundInterface } from "../IndexFund";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_timelockAddress",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "_lockedFundAddresses",
        type: "address[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "pilotAmount",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "circulatingPilotSupply",
        type: "uint256",
      },
    ],
    name: "Withdrawn",
    type: "event",
  },
  {
    stateMutability: "payable",
    type: "fallback",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_accounts",
        type: "address[]",
      },
    ],
    name: "addLockedFundsAddresses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "circulatingSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "supply",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "lockedFundAddresses",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address payable",
        name: "_newVersion",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "tokens",
        type: "address[]",
      },
    ],
    name: "migrateFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_index",
        type: "uint256",
      },
    ],
    name: "removeLockedFundsAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_tokenAddresses",
        type: "address[]",
      },
      {
        internalType: "uint256",
        name: "_pilotAmount",
        type: "uint256",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b506040516200118d3803806200118d833981810160405260408110156200003757600080fd5b8151602083018051604051929492938301929190846401000000008211156200005f57600080fd5b9083019060208201858111156200007557600080fd5b82518660208202830111640100000000821117156200009357600080fd5b82525081516020918201928201910280838360005b83811015620000c2578181015183820152602001620000a8565b50505050919091016040525050600080546001600160a01b0319166001600160a01b03861617905550508051620001019060019060208401906200010a565b5050506200018b565b82805482825590600052602060002090810192821562000162579160200282015b828111156200016257825182546001600160a01b0319166001600160a01b039091161782556020909201916001909101906200012b565b506200017092915062000174565b5090565b5b8082111562000170576000815560010162000175565b610ff2806200019b6000396000f3fe6080604052600436106100695760003560e01c80639358928b116100435780639358928b146101d957806397ecc0fb14610200578063e3511faf1461024657610070565b806317764f0b146100725780634333c5a51461009c578063515fdde31461014c57610070565b3661007057005b005b34801561007e57600080fd5b506100706004803603602081101561009557600080fd5b50356102f8565b3480156100a857600080fd5b50610070600480360360208110156100bf57600080fd5b8101906020810181356401000000008111156100da57600080fd5b8201836020820111156100ec57600080fd5b8035906020019184602083028401116401000000008311171561010e57600080fd5b91908080602002602001604051908101604052809392919081815260200183836020028082843760009201919091525092955061040d945050505050565b34801561015857600080fd5b506100706004803603604081101561016f57600080fd5b6001600160a01b03823516919081019060408101602082013564010000000081111561019a57600080fd5b8201836020820111156101ac57600080fd5b803590602001918460208302840111640100000000831117156101ce57600080fd5b509092509050610566565b3480156101e557600080fd5b506101ee610706565b60408051918252519081900360200190f35b34801561020c57600080fd5b5061022a6004803603602081101561022357600080fd5b5035610871565b604080516001600160a01b039092168252519081900360200190f35b34801561025257600080fd5b506100706004803603604081101561026957600080fd5b81019060208101813564010000000081111561028457600080fd5b82018360208201111561029657600080fd5b803590602001918460208302840111640100000000831117156102b857600080fd5b919080806020026020016040519081016040528093929190818152602001838360200280828437600092019190915250929550509135925061089b915050565b6000546001600160a01b03163314610357576040805162461bcd60e51b815260206004820152601960248201527f494e4445585f46554e443a3a204e4f545f54494d454c4f434b00000000000000604482015290519081900360640190fd5b60006001600160a01b03166001828154811061036f57fe5b6000918252602090912001546001600160a01b031614156103d7576040805162461bcd60e51b815260206004820152601f60248201527f494e4445585f46554e443a3a20454c454d454e545f4e4f545f45584953545300604482015290519081900360640190fd5b600181815481106103e457fe5b6000918252602090912001805473ffffffffffffffffffffffffffffffffffffffff1916905550565b6000546001600160a01b0316331461046c576040805162461bcd60e51b815260206004820152601960248201527f494e4445585f46554e443a3a204e4f545f54494d454c4f434b00000000000000604482015290519081900360640190fd5b60005b81518162ffffff1610156105625760006001600160a01b0316828262ffffff168151811061049957fe5b60200260200101516001600160a01b031614156104fd576040805162461bcd60e51b815260206004820152601960248201527f494e4445585f46554e443a3a205a45524f5f4144445245535300000000000000604482015290519081900360640190fd5b6001828262ffffff168151811061051057fe5b602090810291909101810151825460018082018555600094855292909320909201805473ffffffffffffffffffffffffffffffffffffffff19166001600160a01b03909316929092179091550161046f565b5050565b6000546001600160a01b031633146105c5576040805162461bcd60e51b815260206004820152601960248201527f494e4445585f46554e443a3a204e4f545f54494d454c4f434b00000000000000604482015290519081900360640190fd5b3060005b62ffffff81168311156106b4576106ac8585858462ffffff168181106105eb57fe5b905060200201356001600160a01b03166001600160a01b03166370a08231856040518263ffffffff1660e01b815260040180826001600160a01b0316815260200191505060206040518083038186803b15801561064757600080fd5b505afa15801561065b573d6000803e3d6000fd5b505050506040513d602081101561067157600080fd5b5051868662ffffff861681811061068457fe5b905060200201356001600160a01b03166001600160a01b0316610b2e9092919063ffffffff16565b6001016105c9565b506001600160a01b0381163115610700576040516001600160a01b03808616919083163180156108fc02916000818181858888f193505050501580156106fe573d6000803e3d6000fd5b505b50505050565b60008060005b60015462ffffff821610156107ef57732e53716051be4bcce9f546fcfb0ef7632e505dbd6001600160a01b03166370a0823160018362ffffff168154811061075057fe5b60009182526020918290200154604080517fffffffff0000000000000000000000000000000000000000000000000000000060e086901b1681526001600160a01b0390921660048301525160248083019392829003018186803b1580156107b657600080fd5b505afa1580156107ca573d6000803e3d6000fd5b505050506040513d60208110156107e057600080fd5b5051919091019060010161070c565b5080732e53716051be4bcce9f546fcfb0ef7632e505dbd6001600160a01b03166318160ddd6040518163ffffffff1660e01b815260040160206040518083038186803b15801561083e57600080fd5b505afa158015610852573d6000803e3d6000fd5b505050506040513d602081101561086857600080fd5b50510392915050565b6001818154811061088157600080fd5b6000918252602090912001546001600160a01b0316905081565b6000806108a6610706565b905042333083670de0b6b3a76400008702816108be57fe5b049450732e53716051be4bcce9f546fcfb0ef7632e505dbd6001600160a01b03166379cc679083886040518363ffffffff1660e01b815260040180836001600160a01b0316815260200182815260200192505050600060405180830381600087803b15801561092c57600080fd5b505af1158015610940573d6000803e3d6000fd5b5050505060005b8751811015610b2457600088828151811061095e57fe5b602090810291909101810151604080516001600160a01b039283168185015291871682820152606080830189905281518084039091018152608090920181528151918301919091206000818152600290935291205490915060ff16156109f55760405162461bcd60e51b8152600401808060200182810382526023815260200180610f996023913960400191505060405180910390fd5b6000610a158a8481518110610a0657fe5b6020026020010151858a610b9a565b6000838152600260205260408120805460ff191660011790558b51919250908b9085908110610a4057fe5b60200260200101516001600160a01b031614610a8c57610a8785828c8681518110610a6757fe5b60200260200101516001600160a01b0316610b2e9092919063ffffffff16565b610ac4565b6040516001600160a01b0386169082156108fc029083906000818181858888f19350505050158015610ac2573d6000803e3d6000fd5b505b80898b8581518110610ad257fe5b60200260200101516001600160a01b03167f75e161b3e824b114fc1a33274bd7091918dd4e639cede50b78b15a4eea956a218a6040518082815260200191505060405180910390a45050600101610947565b5050505050505050565b604080516001600160a01b038416602482015260448082018490528251808303909101815260649091019091526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1663a9059cbb60e01b179052610b95908490610ca3565b505050565b6000806001600160a01b03851615610c2a57846001600160a01b03166370a08231856040518263ffffffff1660e01b815260040180826001600160a01b0316815260200191505060206040518083038186803b158015610bf957600080fd5b505afa158015610c0d573d6000803e3d6000fd5b505050506040513d6020811015610c2357600080fd5b5051610c36565b836001600160a01b0316315b905060008111610c8d576040805162461bcd60e51b815260206004820152601860248201527f494e44455846554e443a3a205a45524f5f42414c414e43450000000000000000604482015290519081900360640190fd5b670de0b6b3a76400008184020495945050505050565b6000610cf8826040518060400160405280602081526020017f5361666545524332303a206c6f772d6c6576656c2063616c6c206661696c6564815250856001600160a01b0316610d549092919063ffffffff16565b805190915015610b9557808060200190516020811015610d1757600080fd5b5051610b955760405162461bcd60e51b815260040180806020018281038252602a815260200180610fbc602a913960400191505060405180910390fd5b6060610d638484600085610d6d565b90505b9392505050565b606082471015610dae5760405162461bcd60e51b8152600401808060200182810382526026815260200180610f736026913960400191505060405180910390fd5b610db785610ec8565b610e08576040805162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e7472616374000000604482015290519081900360640190fd5b600080866001600160a01b031685876040518082805190602001908083835b60208310610e465780518252601f199092019160209182019101610e27565b6001836020036101000a03801982511681845116808217855250505050505090500191505060006040518083038185875af1925050503d8060008114610ea8576040519150601f19603f3d011682016040523d82523d6000602084013e610ead565b606091505b5091509150610ebd828286610ece565b979650505050505050565b3b151590565b60608315610edd575081610d66565b825115610eed5782518084602001fd5b8160405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b83811015610f37578181015183820152602001610f1f565b50505050905090810190601f168015610f645780820380516001836020036101000a031916815260200191505b509250505060405180910390fdfe416464726573733a20696e73756666696369656e742062616c616e636520666f722063616c6c494e44455846554e443a3a20544f4b454e5f414c52454144595f57495448445241574e5361666545524332303a204552433230206f7065726174696f6e20646964206e6f742073756363656564a164736f6c6343000706000a";

export class IndexFund__factory extends ContractFactory {
  constructor(
    ...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>
  ) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(
    _timelockAddress: string,
    _lockedFundAddresses: string[],
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<IndexFund> {
    return super.deploy(
      _timelockAddress,
      _lockedFundAddresses,
      overrides || {},
    ) as Promise<IndexFund>;
  }
  getDeployTransaction(
    _timelockAddress: string,
    _lockedFundAddresses: string[],
    overrides?: Overrides & { from?: string | Promise<string> },
  ): TransactionRequest {
    return super.getDeployTransaction(
      _timelockAddress,
      _lockedFundAddresses,
      overrides || {},
    );
  }
  attach(address: string): IndexFund {
    return super.attach(address) as IndexFund;
  }
  connect(signer: Signer): IndexFund__factory {
    return super.connect(signer) as IndexFund__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): IndexFundInterface {
    return new utils.Interface(_abi) as IndexFundInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider,
  ): IndexFund {
    return new Contract(address, _abi, signerOrProvider) as IndexFund;
  }
}