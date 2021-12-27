//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/drafts/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./base/PeripheryPayments.sol";

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "./interfaces/IUnipilotVault.sol";
import "./libraries/UnipilotMaths.sol";

contract UnipilotVault is
    ERC20Permit,
    ERC20Burnable,
    IUnipilotVault,
    PeripheryPayments
{
    using SafeMath for uint256;
    address public token0;
    address public token1;
    IUniswapV3Pool private pool;
    address public governance;
    address private router;
    uint256 public fee;
    uint256 private amount0;
    uint256 private amount1;
    int24 private baseTickLower;
    int24 private baseTickUpper;
    int24 private rangeTickLower;
    int24 private rangeTickUpper;

    //mappings
    //modifiers
    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    modifier onlyRouter() {
        require(msg.sender == router, "NR");
        _;
    }

    constructor()
        // address _governance,
        // address _pool,
        // string memory _name,
        // string memory _symbol
        ERC20Permit("Vault")
        ERC20("Vault", "VAULT")
    {
        // governance = _governance;
        // pool = IUniswapV3Pool(_pool);
        // initializeVault(pool);
    }

    function initializeVault(IUniswapV3Pool pool) internal {
        token0 = pool.token0();
        token1 = pool.token1();
        fee = pool.fee();
    }

    function deposit(
        address depositor,
        address recipient,
        uint256 amount0,
        uint256 amount1
    ) external override returns (uint256 lpShares) {
        uint256 currentPrice = UnipilotMaths.getCurrentPrice(
            UnipilotMaths.currentTick(pool)
        );
        uint256 token0PriceInToken1 = FullMath.mulDiv(
            amount0,
            currentPrice,
            UnipilotMaths.PRECISION
        );
        lpShares = amount1.add(token0PriceInToken1);

        _mint(recipient, lpShares);

        pay(token0, depositor, address(this), amount0);

        pay(token1, depositor, address(this), amount1);

        emit Deposit(depositor, amount0, amount1, lpShares);
    }

    function getVaultInfo()
        external
        view
        override
        returns (
            address,
            address,
            uint256
        )
    {
        return (token0, token1, fee);
    }
}
