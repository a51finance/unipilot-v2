//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";

import "./UnipilotVault.sol";

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "hardhat/console.sol";

contract UnipilotFactory is IUnipilotFactory {
    address public override governance;
    address private uniswapFactory;
    address private uniStrategy;

    constructor(
        address _uniswapFactory,
        address _governance,
        address _uniStrategy
    ) {
        governance = _governance;
        uniswapFactory = _uniswapFactory;
        uniStrategy = _uniStrategy;
    }

    mapping(address => mapping(address => mapping(uint24 => address)))
        private vaults;

    modifier isGovernance() {
        require(msg.sender == governance, "NG");
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
    ) external override returns (address _vault, address _pool) {
        require(_tokenA != _tokenB, "TE");
        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
        require(vaults[token0][token1][_fee] == address(0), "VE");
        address pool = IUniswapV3Factory(uniswapFactory).getPool(
            token0,
            token1,
            _fee
        );
        console.log("pool 1", pool);

        if (pool == address(0)) {
            pool = IUniswapV3Factory(uniswapFactory).createPool(
                token0,
                token1,
                _fee
            );
            console.log("pool 2", pool);

            IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        }
        _pool = pool;
        _vault = _deploy(
            token0,
            token1,
            _fee,
            pool,
            uniStrategy,
            _name,
            _symbol
        );
        vaults[token0][token1][_fee] = _vault;
        emit VaultCreated(token0, token1, _fee);
    }

    function getVaults(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) external view override returns (address _vault) {
        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
        _vault = vaults[token0][token1][_fee];
    }

    function setGovernance(address _newGovernance)
        external
        override
        isGovernance
    {
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    function _deploy(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        address _pool,
        address _unistrategy,
        string memory _name,
        string memory _symbol
    ) private returns (address _vault) {
        _vault = address(
            new UnipilotVault{
                salt: keccak256(abi.encode(_tokenA, _tokenB, _fee))
            }(governance, _pool, _unistrategy, _name, _symbol)
        );
    }
}
