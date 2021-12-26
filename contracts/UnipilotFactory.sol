//SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;

import "./interfaces/IUnipilotFactory.sol";

import { UnipilotVault } from "./UnipilotVault.sol";
import "./UnipilotDeployer.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UnipilotFactory is IUnipilotFactory {
    address public override owner;
    address public immutable uniswapFactory;

    constructor(address _uniswapFactory) {
        owner = msg.sender;
        uniswapFactory = _uniswapFactory;
    }

    mapping(address => mapping(address => mapping(uint24 => address)))
        public vaults;

    modifier isOwner() {
        require(msg.sender == owner, "NO");
        _;
    }

    //createVault
    function createVault(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external override returns (address _vault) {
        require(vaults[_tokenA][_tokenB][_fee] == address(0), "VE");
        address pool = IUniswapV3Factory(uniswapFactory).getPool(
            _tokenA,
            _tokenB,
            _fee
        );
        if (pool == address(0)) {
            pool = IUniswapV3Factory(uniswapFactory).createPool(
                _tokenA,
                _tokenB,
                _fee
            );
            IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        }
        _vault = deploy(_tokenA, _tokenB, _fee, pool, _name, _symbol);
        vaults[_tokenA][_tokenB][_fee] = _vault;
        vaults[_tokenB][_tokenA][_fee] = _vault;
        emit VaultCreated(_tokenA, _tokenB, _fee);
    }

    function getVaults(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) external view override returns (address _vault) {
        _vault = vaults[_tokenA][_tokenB][_fee];
    }

    function setOwner(address _newOwner) external override isOwner {
        emit OwnerChanged(owner, _newOwner);
        owner = _newOwner;
    }

    function deploy(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        address _pool,
        string memory _name,
        string memory _symbol
    ) private returns (address _vault) {
        _vault = address(
            new UnipilotVault{
                salt: keccak256(abi.encode(_tokenA, _tokenB, _fee))
            }(owner, _pool, _name, _symbol)
        );
    }
}
