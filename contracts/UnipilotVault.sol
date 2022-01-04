//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./base/PeripheryPayments.sol";

import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUniStrategy.sol";

import "./libraries/UnipilotMaths.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";

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
    address private strategy;
    address public governance;

    address private router = 0xf4bcfd18C282E795D52CCf0beab2B16a56C83Ba9;
    uint256 private fee;
    // address private router;
    // address private strategy;
    // address public governance;

    int24 private tickSpacing;
    int24 private baseTickLower;
    int24 private baseTickUpper;

    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    constructor(
        address _governance,
        address _pool,
        address _strategy,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        governance = _governance;
        strategy = _strategy;
        initializeVault(_pool);
    }

    function initializeVault(address _pool) internal {
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

        (uint256 lpShares, uint256 amount0, uint256 amount1) = _computeLPShares(
            _amount0Desired,
            _amount1Desired,
            totalSupply()
        );
        require(lpShares != 0, "ISH");
        require(
            amount0 >= _amount0Desired && amount1 >= _amount1Desired,
            "IAM"
        );

        if (msg.sender != router) {
            pay(address(token0), _depositor, address(this), _amount0Desired);
            pay(address(token1), _depositor, address(this), _amount1Desired);
        }

        _mint(_recipient, lpShares);
        emit Deposit(_depositor, _amount0Desired, _amount1Desired, lpShares);
        return lpShares;
    }

    function _computeLPShares(
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 totalSupply
    )
        internal
        view
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
    {
        // uint256 totalSupply = totalSupply();
        uint256 reserve0;
        uint256 reserve1;
        (reserve0, reserve1) = getReserves();
        // If total supply > 0, pool can't be empty
        assert(totalSupply == 0 || reserve0 != 0 || reserve1 != 0);

        if (totalSupply == 0) {
            // For first deposit, just use the amounts desired
            amount0 = amount0Max;
            amount1 = amount1Max;
            shares = amount0 > amount1 ? amount0 : amount1; // max
        } else if (reserve0 == 0) {
            amount1 = amount1Max;
            shares = FullMath.mulDiv(amount1, totalSupply, reserve1);
        } else if (reserve1 == 0) {
            amount0 = amount0Max;
            shares = FullMath.mulDiv(amount0, totalSupply, reserve0);
        } else {
            amount0 = FullMath.mulDiv(amount1Max, reserve0, reserve1);

            if (amount0 < amount0Max) {
                amount1 = amount1Max;
                shares = FullMath.mulDiv(amount1, totalSupply, reserve1);
            } else {
                amount0 = amount0Max;
                amount1 = FullMath.mulDiv(amount0, reserve1, reserve0);
                shares = FullMath.mulDiv(amount0, totalSupply, reserve0);
            }
        }
    }

    function getReserves()
        public
        view
        returns (uint256 reserve0, uint256 reserve1)
    {
        reserve0 = _balance0();
        reserve1 = _balance1();

        // if (totalAmount0 == 0 && totalAmount1 == 0) {
            uint256 temp0;
            uint256 temp1;
            (temp0, temp1) = _collectableAmountsAsOfLastPoke(
                baseTickLower,
                baseTickUpper
            );
            reserve0 += temp0;
            reserve1 += temp1;
        // }
    }

    function _collectableAmountsAsOfLastPoke(int24 _lowerTick, int24 _upperTick)
        public
        view
        returns (uint256, uint256)
    {
        (
            uint128 liquidity,
            ,
            ,
            uint128 earnable0,
            uint128 earnable1
        ) = UnipilotMaths._position(
                pool,
                address(this),
                _lowerTick,
                _upperTick
            );
        (uint256 burnable0, uint256 burnable1) = UniswapLiquidityManagement
            .getAmountsForLiquidity(pool, liquidity, _lowerTick, _upperTick);

        return (burnable0 + earnable0, burnable1 + earnable1);
    }

    function _readjustLiquidity(int24 baseThreshold, address indexFund)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        ReadjustVars memory a;
        pool.updatePosition(baseTickLower, baseTickUpper);

        (, a.fees0, a.fees1) = pool.getPositionLiquidity(
            baseTickLower,
            baseTickUpper
        );

        (a.sqrtPriceX96, a.currentTick, , , , , ) = pool.slot0();

        pool.burnLiquidity(baseTickLower, baseTickUpper, address(this));

        if (a.fees0 > 0)
            token0.transfer(indexFund, FullMath.mulDiv(a.fees0, 10, 100));
        if (a.fees1 > 0)
            token1.transfer(indexFund, FullMath.mulDiv(a.fees1, 10, 100));

        emit FeesSnapshot(
            a.currentTick,
            a.fees0,
            a.fees1,
            _balance0(),
            _balance1(),
            totalSupply()
        );

        (a.tickLower, a.tickUpper) = UniswapLiquidityManagement.getBaseTicks(
            a.currentTick,
            baseThreshold,
            tickSpacing
        );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        a.liquidity = pool.getLiquidityForAmounts(
            a.amount0Desired,
            a.amount1Desired,
            a.tickLower,
            a.tickUpper
        );

        (a.amount0, a.amount1) = pool.getAmountsForLiquidity(
            a.liquidity,
            a.tickLower,
            a.tickUpper
        );

        a.zeroForOne = UniswapLiquidityManagement.amountsDirection(
            a.amount0Desired,
            a.amount1Desired,
            a.amount0,
            a.amount1
        );

        a.amountSpecified = a.zeroForOne
            ? int256(FullMath.mulDiv(a.amount0Desired.sub(a.amount0), 50, 100))
            : int256(FullMath.mulDiv(a.amount1Desired.sub(a.amount1), 50, 100));

        a.exactSqrtPriceImpact = (a.sqrtPriceX96 * (1e5 / 2)) / 1e6;

        a.sqrtPriceLimitX96 = a.zeroForOne
            ? a.sqrtPriceX96 - a.exactSqrtPriceImpact
            : a.sqrtPriceX96 + a.exactSqrtPriceImpact;

        pool.swap(
            address(this),
            a.zeroForOne,
            a.amountSpecified,
            a.sqrtPriceLimitX96,
            abi.encode(a.zeroForOne)
        );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        (baseTickLower, baseTickUpper) = pool.getPositionTicks(
            a.amount0Desired,
            a.amount1Desired,
            baseThreshold,
            tickSpacing
        );

        a.liquidity = pool.getLiquidityForAmounts(
            a.amount0Desired,
            a.amount1Desired,
            baseTickLower,
            baseTickUpper
        );

        (amount0, amount1) = pool.mint(
            address(this),
            baseTickLower,
            baseTickUpper,
            a.liquidity,
            abi.encode(address(this))
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
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external override {
        _verifyCallback();
        require(amount0 > 0 || amount1 > 0);
        bool zeroForOne = abi.decode(data, (bool));

        if (zeroForOne)
            pay(address(token0), address(this), msg.sender, uint256(amount0));
        else pay(address(token1), address(this), msg.sender, uint256(amount1));
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
