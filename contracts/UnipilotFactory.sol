//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./UnipilotVault.sol";
import "./interfaces/IUnipilotFactory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UnipilotFactory is IUnipilotFactory {
    IUniswapV3Factory private uniswapFactory;
    address private governance;
    address private strategy;
    address private indexFund;
    address private WETH;

    constructor(
        address _uniswapFactory,
        address _governance,
        address _uniStrategy,
        address _indexFund,
        address _WETH
    ) {
        governance = _governance;
        strategy = _uniStrategy;
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        indexFund = _indexFund;
        WETH = _WETH;
    }

    mapping(address => mapping(address => mapping(uint24 => address)))
        public vaults;

    mapping(address => bool) public override whitelistedVaults;

    function createVault(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external override returns (address _vault) {
        require(_tokenA != _tokenB, "TE");
        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
        require(vaults[token0][token1][_fee] == address(0), "VE");
        address pool = uniswapFactory.getPool(token0, token1, _fee);

        if (pool == address(0)) {
            pool = uniswapFactory.createPool(token0, token1, _fee);
            IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        }
        _vault = address(
            new UnipilotVault{
                salt: keccak256(abi.encodePacked(_tokenA, _tokenB, _fee))
            }(pool, address(this), WETH, _name, _symbol)
        );
        vaults[token0][token1][_fee] = _vault;
        vaults[token1][token0][_fee] = _vault; // populate mapping in the reverse direction
        emit VaultCreated(token0, token1, _fee, _vault);
    }

    function getUnipilotDetails()
        external
        view
        override
        returns (
            address,
            address,
            address
        )
    {
        return (governance, strategy, indexFund);
    }

    function setGovernance(address _newGovernance) external {
        require(msg.sender == governance, "NG");
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    function whitelistVaults(address[] memory vaultAddresses) external {
        for (uint256 i = 0; i < vaultAddresses.length; i++) {
            address toggleAddress = vaultAddresses[i];
            whitelistedVaults[toggleAddress] = !whitelistedVaults[
                toggleAddress
            ];
        }
    }
}
