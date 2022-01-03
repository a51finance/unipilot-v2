// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import "./SafeCastExtended.sol";
import "./UniswapLiquidityManagment.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/// @title Liquidity and ticks functions
/// @notice Provides functions for computing liquidity and ticks for token amounts and prices
library UniswapPoolActions {
    using SafeCastExtended for uint256;
    using UniswapLiquidityManagment for IUniswapV3Pool;

    function updatePosition(
        IUniswapV3Pool pool,
        int24 tickLower,
        int24 tickUpper
    ) internal {
        (uint128 liquidity, , ) = pool.getPositionLiquidity(
            tickLower,
            tickUpper
        );

        if (liquidity > 0) {
            pool.burn(tickLower, tickUpper, 0);
        }
    }

    function burnLiquidity(
        IUniswapV3Pool pool,
        int24 tickLower,
        int24 tickUpper,
        address recipient
    ) internal returns (uint256 amount0, uint256 amount1) {
        (uint128 liquidity, , ) = pool.getPositionLiquidity(
            tickLower,
            tickUpper
        );

        if (liquidity > 0) {
            (amount0, amount1) = pool.burn(tickLower, tickUpper, liquidity);

            if (amount0 > 0 || amount1 > 0) {
                (amount0, amount0) = pool.collect(
                    recipient,
                    tickLower,
                    tickUpper,
                    amount0.toUint128(),
                    amount1.toUint128()
                );
            }
        }
    }

    function burnUserLiquidity(
        IUniswapV3Pool pool,
        int24 tickLower,
        int24 tickUpper,
        uint256 userSharePercentage,
        address recipient
    ) internal returns (uint256 amount0, uint256 amount1) {
        (uint128 liquidity, , ) = pool.getPositionLiquidity(
            tickLower,
            tickUpper
        );

        uint256 liquidityRemoved = FullMath.mulDiv(
            uint256(liquidity),
            userSharePercentage,
            1e18
        );

        (amount0, amount1) = pool.burn(
            tickLower,
            tickUpper,
            liquidityRemoved.toUint128()
        );

        if (amount0 > 0 || amount1 > 0) {
            (amount0, amount0) = pool.collect(
                recipient,
                tickLower,
                tickUpper,
                amount0.toUint128(),
                amount1.toUint128()
            );
        }
    }
}
