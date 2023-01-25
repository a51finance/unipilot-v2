//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./UnipilotPassiveVault.sol";
import "./interfaces/IUnipilotFactory.sol";
import "@cryptoalgebra/core/contracts/interfaces/IAlgebraFactory.sol";
import "@cryptoalgebra/core/contracts/interfaces/IAlgebraPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Unipilot Passive Factory
/// @author 0xMudassir & 721Orbit
/// @notice Deploys Unipilot vaults for any uniswap v3 pair by any user.
/// passive liquidity managament strategy will be used in these vaults
/// all passive vaults can be managed by any user
contract UnipilotPassiveFactory is IUnipilotFactory {
    address private WETH;
    address private governance;
    address private strategy;
    address private indexFund;

    uint8 private swapPercentage;
    uint8 private indexFundPercentage;
    IAlgebraFactory private algebraFactory;

    constructor(
        address _algebraFactory,
        address _governance,
        address _uniStrategy,
        address _indexFund,
        address _WETH,
        uint8 _indexFundPercentage,
        uint8 _swapPercentage
    ) {
        governance = _governance;
        strategy = _uniStrategy;
        algebraFactory = IAlgebraFactory(_algebraFactory);
        indexFund = _indexFund;
        WETH = _WETH;
        indexFundPercentage = _indexFundPercentage;
        swapPercentage = _swapPercentage;
    }

    mapping(address => mapping(address => mapping(uint16 => address)))
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
        uint16 _vaultStrategy,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external override returns (address _vault) {
        require(_tokenA != _tokenB);

        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);

        address pool = algebraFactory.poolByPair(token0, token1);

        if (pool != address(0)) {
            require(vaults[token0][token1][0] == address(0));
        } else {
            pool = algebraFactory.createPool(token0, token1);
            IAlgebraPool(pool).initialize(_sqrtPriceX96);
        }

        ERC20 token0Instance = ERC20(token0);
        ERC20 token1Instance = ERC20(token1);

        _name = string(
            abi.encodePacked(
                "Unipilot ",
                token0Instance.symbol(),
                "/",
                token1Instance.symbol(),
                " Passive"
                " Vault"
            )
        );

        _symbol = string(
            abi.encodePacked(
                "ULP",
                "-",
                token0Instance.symbol(),
                "/",
                token1Instance.symbol(),
                "-",
                "PV"
            )
        );

        _vault = address(
            new UnipilotPassiveVault{
                salt: keccak256(abi.encodePacked(_tokenA, _tokenB))
            }(pool, address(this), WETH, _name, _symbol)
        );

        vaults[token0][token1][0] = _vault;
        vaults[token1][token0][0] = _vault; // populate mapping in the reverse direction
        emit VaultCreated(token0, token1, _vaultStrategy, _vault);
    }

    /// @notice Updates the governance of all Unipilot passive vaults
    /// @dev Must be called by the current governance
    /// @param _newGovernance The new governance of the Unipilot passive factory
    function setGovernance(address _newGovernance) external onlyGovernance {
        require(_newGovernance != address(0));
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    /// @notice Updates all the necessary Unipilot details used in passive vaults
    /// @dev Must be called by the current governance
    /// @param _strategy Unipilot strategy address
    /// @param _indexFund Unipilot index fund account
    /// @param _swapPercentage Percentage of swap during readjust liquidity
    /// @param _indexFundPercentage Percentage of fees for index fund
    function setUnipilotDetails(
        address _strategy,
        address _indexFund,
        uint8 _swapPercentage,
        uint8 _indexFundPercentage
    ) external onlyGovernance {
        require(_strategy != address(0) && _indexFund != address(0));
        require(_swapPercentage > 0 && _swapPercentage < 100);
        require(_indexFundPercentage > 0 && _indexFundPercentage < 100);
        strategy = _strategy;
        indexFund = _indexFund;
        indexFundPercentage = _indexFundPercentage;
        swapPercentage = _swapPercentage;
    }
}
