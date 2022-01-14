//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";
import "./UnipilotVault.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UnipilotFactory is IUnipilotFactory {
    address private uniStrategy;
    address private uniswapFactory;
    address public override governance;

    constructor(
        address _uniswapFactory,
        address _governance,
        address _uniStrategy
    ) {
        governance = _governance;
        uniStrategy = _uniStrategy;
        uniswapFactory = _uniswapFactory;
    }

    mapping(address => mapping(address => mapping(uint24 => address)))
        private vaults;

    mapping(address => bool) private whitelistedVaults;

    modifier isGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

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

        if (pool == address(0)) {
            pool = IUniswapV3Factory(uniswapFactory).createPool(
                token0,
                token1,
                _fee
            );

            IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        }
        console.log("pool adress in factory", pool);

        _pool = pool;
        _vault = _deploy(token0, token1, _fee, pool, _name, _symbol);
        vaults[token0][token1][_fee] = _vault;
        emit VaultCreated(token0, token1, _fee);
    }

    function getVaults(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) external view override returns (address _vault, bool _whitelisted) {
        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
        _vault = vaults[token0][token1][_fee];
        _whitelisted = whitelistedVaults[_vault];
    }

    function setGovernance(address _newGovernance)
        external
        override
        isGovernance
    {
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    function whitelistVaults(address[] memory vaults) external isGovernance {
        for (uint256 i = 0; i < vaults.length; i++) {
            address toggleAddress = vaults[i];
            whitelistedVaults[toggleAddress] = !whitelistedVaults[
                toggleAddress
            ];
        }
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
            }(_pool, uniStrategy, governance, address(this), _name, _symbol)
        );
    }
}
