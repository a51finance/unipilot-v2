//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./UnipilotPassiveVault.sol";
import "./interfaces/IUnipilotFactory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/// @title Unipilot factory
/// @notice Deploys Unipilot vaults and manages ownership and control over active and passive vaults
contract UnipilotPassiveFactory is IUnipilotFactory {
    address private governance;
    address private strategy;
    address private indexFund;
    address private WETH;
    uint8 private indexFundPercentage;
    IUniswapV3Factory private uniswapFactory;

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
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        indexFund = _indexFund;
        WETH = _WETH;
        indexFundPercentage = percentage;
    }

    /// @notice Used to give address of vaults
    /// @return vault address
    mapping(address => mapping(address => mapping(uint24 => address)))
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
            uint8
        )
    {
        return (governance, strategy, indexFund, indexFundPercentage);
    }

    /// @inheritdoc IUnipilotFactory
    function createVault(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external override returns (address _vault) {
        require(_tokenA != _tokenB);
        (address token0, address token1) = _tokenA < _tokenB
            ? (_tokenA, _tokenB)
            : (_tokenB, _tokenA);
        require(vaults[token0][token1][_fee] == address(0));
        address pool = uniswapFactory.getPool(token0, token1, _fee);

        if (pool == address(0)) {
            pool = uniswapFactory.createPool(token0, token1, _fee);
            IUniswapV3Pool(pool).initialize(_sqrtPriceX96);
        }
        _vault = address(
            new UnipilotPassiveVault{
                salt: keccak256(abi.encodePacked(_tokenA, _tokenB, _fee))
            }(pool, address(this), WETH, _name, _symbol)
        );
        vaults[token0][token1][_fee] = _vault;
        vaults[token1][token0][_fee] = _vault; // populate mapping in the reverse direction
        emit VaultCreated(token0, token1, _fee, _vault);
    }

    /// @notice Updates the governance of the Unipilot factory
    /// @dev Must be called by the current governance
    /// @param _newGovernance The new governance of the Unipilot factory
    function setGovernance(address _newGovernance) external onlyGovernance {
        require(_newGovernance != address(0));
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    function setUnipilotDetails(
        address _strategy,
        address _indexFund,
        uint8 _indexFundPercentage
    ) external onlyGovernance {
        require(_strategy != address(0) && _indexFund != address(0));
        require(_indexFundPercentage > 0);
        strategy = _strategy;
        indexFund = _indexFund;
        indexFundPercentage = _indexFundPercentage;
    }
}
