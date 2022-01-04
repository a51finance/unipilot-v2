// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-periphery/contracts/libraries/PositionKey.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "./UniswapPoolActions.sol";
import "hardhat/console.sol";

/// @title Liquidity and ticks functions
/// @notice Provides functions for computing liquidity and ticks for token amounts and prices
library UniswapLiquidityManagement {
    using LowGasSafeMath for uint256;

    /// @dev Wrapper around `LiquidityAmounts.getAmountsForLiquidity()`.
    /// @param pool Uniswap V3 pool
    /// @param liquidity  The liquidity being valued
    /// @param _tickLower The lower tick of the range
    /// @param _tickUpper The upper tick of the range
    /// @return amounts of token0 and token1 that corresponds to liquidity
    function getAmountsForLiquidity(
        IUniswapV3Pool pool,
        uint128 liquidity,
        int24 _tickLower,
        int24 _tickUpper
    ) internal view returns (uint256, uint256) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();
        return
            LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(_tickLower),
                TickMath.getSqrtRatioAtTick(_tickUpper),
                liquidity
            );
    }

    /// @dev Wrapper around `LiquidityAmounts.getLiquidityForAmounts()`.
    /// @param pool Uniswap V3 pool
    /// @param amount0 The amount of token0
    /// @param amount1 The amount of token1
    /// @param _tickLower The lower tick of the range
    /// @param _tickUpper The upper tick of the range
    /// @return The maximum amount of liquidity that can be held amount0 and amount1
    function getLiquidityForAmounts(
        IUniswapV3Pool pool,
        uint256 amount0,
        uint256 amount1,
        int24 _tickLower,
        int24 _tickUpper
    ) internal view returns (uint128) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();

        return
            LiquidityAmounts.getLiquidityForAmounts(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(_tickLower),
                TickMath.getSqrtRatioAtTick(_tickUpper),
                amount0,
                amount1
            );
    }

    /// @dev Amount of liquidity in contract position.
    /// @param pool Uniswap V3 pool
    /// @param _tickLower The lower tick of the range
    /// @param _tickUpper The upper tick of the range
    /// @return liquidity stored in position
    function getPositionLiquidity(
        IUniswapV3Pool pool,
        int24 _tickLower,
        int24 _tickUpper
    )
        internal
        view
        returns (
            uint128 liquidity,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        )
    {
        bytes32 positionKey = PositionKey.compute(
            address(this),
            _tickLower,
            _tickUpper
        );
        (liquidity, , , tokensOwed0, tokensOwed1) = pool.positions(positionKey);
    }

    /// @dev Rounds tick down towards negative infinity so that it's a multiple
    /// of `tickSpacing`.
    function floor(int24 tick, int24 tickSpacing)
        internal
        pure
        returns (int24)
    {
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }

    /// @dev Calc base ticks depending on base threshold and tickspacing
    function baseTicks(
        int24 currentTick,
        int24 baseThreshold,
        int24 tickSpacing
    ) internal pure returns (int24 tickLower, int24 tickUpper) {
        int24 tickFloor = floor(currentTick, tickSpacing);

        tickLower = tickFloor - baseThreshold;
        tickUpper = tickFloor + baseThreshold;
    }

    function getReserves(
        int24 baseTickLower,
        int24 baseTickUpper,
        uint256 balance0,
        uint256 balance1,
        IUniswapV3Pool pool
    ) internal returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = balance0;
        reserve1 = balance1;
        uint128 liquidity = UniswapPoolActions.updatePosition(
            pool,
            baseTickLower,
            baseTickUpper
        );
        if (liquidity > 0) {
            uint256 temp0;
            uint256 temp1;
            (temp0, temp1) = _collectableAmountsAsOfLastPoke(
                baseTickLower,
                baseTickUpper,
                pool
            );
            reserve0 += temp0;
            reserve1 += temp1;
        }
    }

    function _collectableAmountsAsOfLastPoke(
        int24 _lowerTick,
        int24 _upperTick,
        IUniswapV3Pool pool
    ) internal view returns (uint256, uint256) {
        (
            uint128 liquidity,
            uint128 earnable0,
            uint128 earnable1
        ) = UniswapLiquidityManagement.getPositionLiquidity(
                pool,
                _lowerTick,
                _upperTick
            );
        (uint256 burnable0, uint256 burnable1) = UniswapLiquidityManagement
            .getAmountsForLiquidity(pool, liquidity, _lowerTick, _upperTick);

        return (burnable0 + earnable0, burnable1 + earnable1);
    }

    function _computeLpShares(
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 totalSupply,
        int24 baseTickLower,
        int24 baseTickUpper,
        uint256 balance0,
        uint256 balance1,
        IUniswapV3Pool pool
    )
        internal
        returns (
            uint256 shares,
            uint256 amount0,
            uint256 amount1
        )
    {
        // uint256 totalSupply = totalSupply();
        uint256 reserve0;
        uint256 reserve1;
        (reserve0, reserve1) = getReserves(
            baseTickLower,
            baseTickUpper,
            balance0,
            balance1,
            pool
        );
        // If total supply > 0, pool can't be empty
        assert(totalSupply == 0 || reserve0 != 0 || reserve1 != 0);
        (shares, amount0, amount1) = _calculateShare(
            amount0Max,
            amount1Max,
            reserve0,
            reserve1,
            totalSupply
        );
    }

    function _calculateShare(
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 reserve0,
        uint256 reserve1,
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
            console.log("RESERVE 0", reserve0);
            console.log("RESERVE 1", reserve1);
            console.log("TOTAL SUPPLY", totalSupply);
            amount0 = FullMath.mulDiv(amount1Max, reserve0, reserve1);
            console.log("AMOUNT 0", amount0);
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
}
