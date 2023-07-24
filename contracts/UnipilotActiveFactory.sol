//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./UnipilotActiveVault.sol";
import "./interfaces/IUnipilotFactory.sol";

import "./pancake-v3/v3-core/contracts/interfaces/IPancakeV3Pool.sol";
import "./pancake-v3/v3-core/contracts/interfaces/IPancakeV3Factory.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Unipilot Active Factory
/// @author 0xMudassir & 721Orbit
/// @notice Deploys Unipilot active vaults and manages ownership and control over all active vaults
/// active liquidity managament strategy will be used in these vaults
/// all active vaults will be managed by Unipilot Captains
contract UnipilotActiveFactory is IUnipilotFactory {
    address private governance;
    address private strategy;
    address private indexFund;
    address private WETH;
    uint8 private swapPercentage;
    uint8 private indexFundPercentage;
    IPancakeV3Factory private uniswapFactory;

    constructor(
        address _uniswapFactory,
        address _governance,
        address _uniStrategy,
        address _indexFund,
        address _WETH,
        uint8 percentage
    ) {
        governance = _governance;
        strategy = _uniStrategy;
        uniswapFactory = IPancakeV3Factory(_uniswapFactory);
        indexFund = _indexFund;
        WETH = _WETH;
        indexFundPercentage = percentage;
    }

    mapping(address => mapping(address => mapping(uint24 => mapping(uint16 => address))))
        public vaults;

    modifier onlyGovernance() {
        require(msg.sender == governance);
        _;
    }

    /// @inheritdoc IUnipilotFactory
    function getUnipilotDetails()
        external
        view
        override
        returns (
            address,
            address,
            address,
            uint8,
            uint8
        )
    {
        return (
            governance,
            strategy,
            indexFund,
            indexFundPercentage,
            swapPercentage
        );
    }

    /// @inheritdoc IUnipilotFactory
    function createVault(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint16 _vaultStrategy,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external override onlyGovernance returns (address _vault) {
        require(_tokenA != _tokenB);

        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);

        address pool = uniswapFactory.getPool(token0, token1, _fee);

        if (pool != address(0)) {
            require(vaults[token0][token1][_fee][0] == address(0));
        } else {
            pool = uniswapFactory.createPool(token0, token1, _fee);
            IPancakeV3Pool(pool).initialize(_sqrtPriceX96);
        }

        _vault = address(
            new UnipilotActiveVault{
                salt: keccak256(abi.encodePacked(_tokenA, _tokenB, _fee))
            }(pool, address(this), WETH, _vaultStrategy, _name, _symbol)
        );

        vaults[token0][token1][_fee][_vaultStrategy] = _vault;
        vaults[token1][token0][_fee][_vaultStrategy] = _vault; // populate mapping in the reverse direction
        emit VaultCreated(token0, token1, _vaultStrategy, _fee, _vault);
    }

    /// @notice Updates the governance of the Unipilot factory
    /// @dev Must be called by the current governance
    /// @param _newGovernance The new governance of the Unipilot factory
    function setGovernance(address _newGovernance) external onlyGovernance {
        require(_newGovernance != address(0));
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    /// @notice Updates all the necessary Unipilot details used in active vaults
    /// @dev Must be called by the current governance
    /// @param _strategy Unipilot strategy address
    /// @param _indexFund Unipilot index fund account
    /// @param _indexFundPercentage Percentage of fees for index fund
    function setUnipilotDetails(
        address _strategy,
        address _indexFund,
        uint8 _indexFundPercentage
    ) external onlyGovernance {
        require(_indexFundPercentage > 0 && _indexFundPercentage < 100);
        strategy = _strategy;
        indexFund = _indexFund;
        indexFundPercentage = _indexFundPercentage;
    }
}
