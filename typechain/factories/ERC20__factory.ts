/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Signer,
  utils,
  BigNumberish,
  Contract,
  ContractFactory,
  Overrides,
} from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ERC20, ERC20Interface } from "../ERC20";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name_",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_decimals",
        type: "uint256",
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
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "_mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000dce38038062000dce833981810160405260608110156200003757600080fd5b81019080805160405193929190846401000000008211156200005857600080fd5b9083019060208201858111156200006e57600080fd5b82516401000000008111828201881017156200008957600080fd5b82525081516020918201929091019080838360005b83811015620000b85781810151838201526020016200009e565b50505050905090810190601f168015620000e65780820380516001836020036101000a031916815260200191505b50604052602001805160405193929190846401000000008211156200010a57600080fd5b9083019060208201858111156200012057600080fd5b82516401000000008111828201881017156200013b57600080fd5b82525081516020918201929091019080838360005b838110156200016a57818101518382015260200162000150565b50505050905090810190601f168015620001985780820380516001836020036101000a031916815260200191505b506040526020908101518551909350620001b9925060039186019062000200565b508151620001cf90600490602085019062000200565b50503360009081526020819052604090206ec097ce7bc90715b34b9f10000000009081905560025550620002ac9050565b828054600181600116156101000203166002900490600052602060002090601f01602090048101928262000238576000855562000283565b82601f106200025357805160ff191683800117855562000283565b8280016001018555821562000283579182015b828111156200028357825182559160200191906001019062000266565b506200029192915062000295565b5090565b5b8082111562000291576000815560010162000296565b610b1280620002bc6000396000f3fe608060405234801561001057600080fd5b50600436106100d45760003560e01c80634e6ec24711610081578063a457c2d71161005b578063a457c2d71461028c578063a9059cbb146102b8578063dd62ed3e146102e4576100d4565b80634e6ec2471461023057806370a082311461025e57806395d89b4114610284576100d4565b806323b872dd116100b257806323b872dd146101b0578063313ce567146101e65780633950935114610204576100d4565b806306fdde03146100d9578063095ea7b31461015657806318160ddd14610196575b600080fd5b6100e1610312565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561011b578181015183820152602001610103565b50505050905090810190601f1680156101485780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6101826004803603604081101561016c57600080fd5b506001600160a01b0381351690602001356103a8565b604080519115158252519081900360200190f35b61019e6103c5565b60408051918252519081900360200190f35b610182600480360360608110156101c657600080fd5b506001600160a01b038135811691602081013590911690604001356103cb565b6101ee610452565b6040805160ff9092168252519081900360200190f35b6101826004803603604081101561021a57600080fd5b506001600160a01b03813516906020013561045b565b61025c6004803603604081101561024657600080fd5b506001600160a01b0381351690602001356104a9565b005b61019e6004803603602081101561027457600080fd5b50356001600160a01b0316610599565b6100e16105b4565b610182600480360360408110156102a257600080fd5b506001600160a01b038135169060200135610615565b610182600480360360408110156102ce57600080fd5b506001600160a01b03813516906020013561067d565b61019e600480360360408110156102fa57600080fd5b506001600160a01b0381358116916020013516610691565b60038054604080516020601f600260001961010060018816150201909516949094049384018190048102820181019092528281526060939092909183018282801561039e5780601f106103735761010080835404028352916020019161039e565b820191906000526020600020905b81548152906001019060200180831161038157829003601f168201915b5050505050905090565b60006103bc6103b56106bc565b84846106c0565b50600192915050565b60025490565b60006103d88484846107ac565b610448846103e46106bc565b61044385604051806060016040528060288152602001610a70602891396001600160a01b038a166000908152600160205260408120906104226106bc565b6001600160a01b031681526020810191909152604001600020549190610907565b6106c0565b5060019392505050565b60055460ff1690565b60006103bc6104686106bc565b8461044385600160006104796106bc565b6001600160a01b03908116825260208083019390935260409182016000908120918c16815292529020549061099e565b6001600160a01b038216610504576040805162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f206164647265737300604482015290519081900360640190fd5b610510600083836109ff565b60025461051d908261099e565b6002556001600160a01b038216600090815260208190526040902054610543908261099e565b6001600160a01b0383166000818152602081815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b6001600160a01b031660009081526020819052604090205490565b60048054604080516020601f600260001961010060018816150201909516949094049384018190048102820181019092528281526060939092909183018282801561039e5780601f106103735761010080835404028352916020019161039e565b60006103bc6106226106bc565b8461044385604051806060016040528060258152602001610ae1602591396001600061064c6106bc565b6001600160a01b03908116825260208083019390935260409182016000908120918d16815292529020549190610907565b60006103bc61068a6106bc565b84846107ac565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b3390565b6001600160a01b0383166107055760405162461bcd60e51b8152600401808060200182810382526024815260200180610abd6024913960400191505060405180910390fd5b6001600160a01b03821661074a5760405162461bcd60e51b8152600401808060200182810382526022815260200180610a286022913960400191505060405180910390fd5b6001600160a01b03808416600081815260016020908152604080832094871680845294825291829020859055815185815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a3505050565b6001600160a01b0383166107f15760405162461bcd60e51b8152600401808060200182810382526025815260200180610a986025913960400191505060405180910390fd5b6001600160a01b0382166108365760405162461bcd60e51b8152600401808060200182810382526023815260200180610a056023913960400191505060405180910390fd5b6108418383836109ff565b61087e81604051806060016040528060268152602001610a4a602691396001600160a01b0386166000908152602081905260409020549190610907565b6001600160a01b0380851660009081526020819052604080822093909355908416815220546108ad908261099e565b6001600160a01b038084166000818152602081815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b600081848411156109965760405162461bcd60e51b81526004018080602001828103825283818151815260200191508051906020019080838360005b8381101561095b578181015183820152602001610943565b50505050905090810190601f1680156109885780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b505050900390565b6000828201838110156109f8576040805162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b9392505050565b50505056fe45524332303a207472616e7366657220746f20746865207a65726f206164647265737345524332303a20617070726f766520746f20746865207a65726f206164647265737345524332303a207472616e7366657220616d6f756e7420657863656564732062616c616e636545524332303a207472616e7366657220616d6f756e74206578636565647320616c6c6f77616e636545524332303a207472616e736665722066726f6d20746865207a65726f206164647265737345524332303a20617070726f76652066726f6d20746865207a65726f206164647265737345524332303a2064656372656173656420616c6c6f77616e63652062656c6f77207a65726fa164736f6c6343000706000a";

export class ERC20__factory extends ContractFactory {
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
    name_: string,
    symbol_: string,
    _decimals: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ERC20> {
    return super.deploy(
      name_,
      symbol_,
      _decimals,
      overrides || {}
    ) as Promise<ERC20>;
  }
  getDeployTransaction(
    name_: string,
    symbol_: string,
    _decimals: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      name_,
      symbol_,
      _decimals,
      overrides || {}
    );
  }
  attach(address: string): ERC20 {
    return super.attach(address) as ERC20;
  }
  connect(signer: Signer): ERC20__factory {
    return super.connect(signer) as ERC20__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20Interface {
    return new utils.Interface(_abi) as ERC20Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC20 {
    return new Contract(address, _abi, signerOrProvider) as ERC20;
  }
}
