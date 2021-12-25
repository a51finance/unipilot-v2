//SPDX-License-Identifier: MIT

pragma solidity ^0.7.4;

import "./interfaces/IUnipilotFactory.sol";

// import './UnipilotVault.sol';
import "./UnipilotDeployer.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UnipilotFactory is IUnipilotFactory, UnipilotDeployer {
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
        uint160 _sqrtPriceX96
    ) external override returns (address _vault) {
        require(vaults[_tokenA][_tokenB][_fee] == address(0), "VE");
        address _pool = IUniswapV3Factory(uniswapFactory).createPool(
            _tokenA,
            _tokenB,
            _fee
        );
        IUniswapV3Pool(_pool).initialize(_sqrtPriceX96);
        _vault = deploy(address(this), _tokenA, _tokenB, _fee);
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
}
