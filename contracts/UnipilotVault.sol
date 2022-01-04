//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./base/PeripheryPayments.sol";

import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUniStrategy.sol";

import "./libraries/UnipilotMaths.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";
import "./libraries/SafeCast.sol";

import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@openzeppelin/contracts/drafts/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

contract UnipilotVault is
    ERC20Permit,
    ERC20Burnable,
    IUnipilotVault,
    PeripheryPayments
{
    using SafeCast for uint256;
    using LowGasSafeMath for uint256;
    using UniswapPoolActions for IUniswapV3Pool;
    using UniswapLiquidityManagement for IUniswapV3Pool;

    IERC20 private token0;
    IERC20 private token1;
    IUniswapV3Pool private pool;
    IUnipilotFactory private factory;
    address private strategy;
    address public governance;

    address private router = 0x0c2547f3E970C308847161c6B37ae668b100B268;
    uint256 private fee;
    uint256 private totalAmount0;
    uint256 private totalAmount1;

    int24 private baseTickLower;
    int24 private baseTickUpper;
    int24 private askTickLower;
    int24 private askTickUpper;
    int24 private bidTickLower;
    int24 private bidTickUpper;
    int24 private tickSpacing;

    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    constructor(
        address _governance,
        address _factory,
        address _pool,
        address _strategy,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        governance = _governance;
        factory = IUnipilotFactory(factory);
        strategy = _strategy;
        initializeVault(_pool);
    }

    function initializeVault(address _pool) internal {
        (
            baseTickLower,
            baseTickUpper,
            bidTickLower,
            bidTickUpper,
            askTickLower,
            askTickUpper
        ) = IUniStrategy(strategy).getTicks(_pool);
        pool = IUniswapV3Pool(_pool);

        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        fee = pool.fee();
        tickSpacing = pool.tickSpacing();
    }

    function deposit(
        address _depositor,
        address _recipient,
        uint256 _amount0Desired,
        uint256 _amount1Desired
    ) external override returns (uint256) {
        require(_depositor != address(0) && _recipient != address(0), "IAD");
        (
            baseTickLower,
            baseTickUpper,
            bidTickLower,
            bidTickUpper,
            askTickLower,
            askTickUpper
        ) = IUniStrategy(strategy).getTicks(address(pool));
        (uint256 lpShares, , ) = UniswapLiquidityManagement._computeLpShares(
            _amount0Desired,
            _amount1Desired,
            totalSupply(),
            baseTickLower,
            baseTickUpper,
            _balance0(),
            _balance1(),
            pool
        );
        require(lpShares != 0, "ISH");

        if (msg.sender != router) {
            pay(address(token0), _depositor, address(this), _amount0Desired);
            pay(address(token1), _depositor, address(this), _amount1Desired);
        }

        _mint(_recipient, lpShares);
        console.log("TOTAL SUPPLY", totalSupply());
        emit Deposit(_depositor, _amount0Desired, _amount1Desired, lpShares);
        return lpShares;
    }

    function readjustLiquidity(int24 baseThreshold, address indexFund)
        external
    {
        pool.updatePosition(baseTickLower, baseTickUpper);

        (, uint256 fees0, uint256 fees1) = pool.getPositionLiquidity(
            baseTickLower,
            baseTickUpper
        );

        if (fees0 > 0) token0.transfer(indexFund, fees0 / 10);
        if (fees1 > 0) token1.transfer(indexFund, fees1 / 10);

        (, int24 currentTick, , , , , ) = pool.slot0();

        emit FeesSnapshot(
            currentTick,
            fees0,
            fees1,
            _balance0(),
            _balance1(),
            totalSupply()
        );

        pool.burnLiquidity(baseTickLower, baseTickUpper, address(this));

        uint256 balance0 = _balance0();
        uint256 balance1 = _balance1();

        (int24 tickLower, int24 tickUpper) = UniswapLiquidityManagement
            .baseTicks(currentTick, baseThreshold, tickSpacing);

        uint128 liquidity = pool.getLiquidityForAmounts(
            balance0,
            balance1,
            tickLower,
            tickUpper
        );

        (uint256 amount0, uint256 amount1) = pool.getAmountsForLiquidity(
            liquidity,
            tickLower,
            tickUpper
        );
    }

    function withdraw(uint256 liquidity, address recipient)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0, "IL");

        (amount0, amount1) = pool.burnUserLiquidity(
            baseTickLower,
            baseTickUpper,
            liquidityShare(liquidity),
            recipient
        );

        uint256 totalSupply = totalSupply();

        uint256 unusedAmount0 = FullMath.mulDiv(
            _balance0(),
            liquidity,
            totalSupply
        );

        uint256 unusedAmount1 = FullMath.mulDiv(
            _balance1(),
            liquidity,
            totalSupply
        );

        if (unusedAmount0 > 0) token0.transfer(recipient, unusedAmount0);
        if (unusedAmount1 > 0) token1.transfer(recipient, unusedAmount1);

        amount0 = amount0.add(unusedAmount0);
        amount1 = amount1.add(unusedAmount1);

        _burn(msg.sender, liquidity);
        emit Withdraw(msg.sender, recipient, liquidity, amount0, amount1);
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
        return (address(token0), address(token1), fee);
    }

    /// @dev Amount of token0 held as unused balance.

    function _balance0() private view returns (uint256) {
        return token0.balanceOf(address(this));
    }

    /// @dev Amount of token1 held as unused balance.
    function _balance1() private view returns (uint256) {
        return token1.balanceOf(address(this));
    }

    function liquidityShare(uint256 liquidity)
        internal
        view
        returns (uint256 liquiditySharePercentage)
    {
        return FullMath.mulDiv(liquidity, 1e18, totalSupply());
    }

    function _addLiquidityUniswap(
        address payer,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal returns (uint256 amount0, uint256 amount1) {
        if (liquidity > 0) {
            (amount0, amount1) = pool.mint(
                address(this),
                tickLower,
                tickUpper,
                liquidity,
                abi.encode(payer)
            );
        }
    }

    /// @inheritdoc IUnipilotVault
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external override {
        _verifyCallback();
        address recipient = msg.sender;
        address payer = abi.decode(data, (address));

        if (amount0Owed > 0)
            pay(address(token0), payer, recipient, amount0Owed);
        if (amount1Owed > 0)
            pay(address(token1), payer, recipient, amount1Owed);
    }

    /// @inheritdoc IUnipilotVault
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        _verifyCallback();
        address recipient = msg.sender;
        address payer = abi.decode(data, (address));

        if (amount0Delta > 0)
            pay(address(token0), payer, recipient, uint256(amount0Delta));
        if (amount1Delta > 0)
            pay(address(token1), payer, recipient, uint256(amount1Delta));
    }

    /// @notice Verify that caller should be the address of a valid Uniswap V3 Pool
    function _verifyCallback() private view {
        require(msg.sender == address(pool));
    }

    // @return tick Uniswap pool's current price tick
    function currentTick() private view returns (int24 tick) {
        (, tick, , , , , ) = pool.slot0();
    }
}
