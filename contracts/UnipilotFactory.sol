//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";

import { UnipilotVault } from "./UnipilotVault.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract UnipilotFactory is IUnipilotFactory {
    address public override governance;
    address public uniswapFactory;

    constructor(address _uniswapFactory, address _governance) {
        governance = _governance;
        uniswapFactory = _uniswapFactory;
    }

    mapping(address => mapping(address => mapping(uint24 => address)))
        public vaults;

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
        _vault = _deploy(_tokenA, _tokenB, _fee, pool, _name, _symbol);
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
        string memory _name,
        string memory _symbol
    ) private returns (address _vault) {
        _vault = address(
            new UnipilotVault{
                salt: keccak256(abi.encode(_tokenA, _tokenB, _fee))
            }(governance, _pool, _name, _symbol)
        );
    }
}
