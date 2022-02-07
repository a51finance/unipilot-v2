//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./UnipilotVault.sol";
import "./interfaces/IUnipilotFactory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/// @title Unipilot factory
/// @notice Deploys Unipilot vaults and manages ownership and control over active and passive vaults
contract UnipilotFactory is IUnipilotFactory {
    address private governance;
    address private strategy;
    address private indexFund;
    address private WETH;
    IUniswapV3Factory private uniswapFactory;

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

    /// @notice Used to give address of vaults
    /// @return vault address
    mapping(address => mapping(address => mapping(uint24 => address)))
        public vaults;

    /// @inheritdoc IUnipilotFactory
    mapping(address => bool) public override whitelistedVaults;

    modifier onlyGovernance() {
        require(msg.sender == governance);
        _;
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

    /// @inheritdoc IUnipilotFactory
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

    /// @notice Updates the governance of the Unipilot factory
    /// @dev Must be called by the current governance
    /// @param _newGovernance The new governance of the Unipilot factory
    function setGovernance(address _newGovernance) external onlyGovernance {
        emit GovernanceChanged(governance, _newGovernance);
        governance = _newGovernance;
    }

    /// @notice toggles to the acitve or passive strategy of the vaults
    /// @dev Must be called by the current governance
    /// @param _vaultAddresses Array of address of vaults for bulk update
    function whitelistVaults(address[] memory _vaultAddresses)
        external
        onlyGovernance
    {
        for (uint256 i = 0; i < _vaultAddresses.length; i++) {
            address toggleAddress = _vaultAddresses[i];
            whitelistedVaults[toggleAddress] = !whitelistedVaults[
                toggleAddress
            ];

            emit VaultWhitelistStatus(
                toggleAddress,
                whitelistedVaults[toggleAddress]
            );
        }
    }
}
