// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6;
pragma abicoder v2;

import "../interfaces/external/IUniswapLiquidityManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract ULMState {
    function getPositionDetails(
        uint256 tokenId,
        address liquidityManagerAddress
    )
        external
        view
        returns (
            address pool,
            address token0,
            address token1,
            int24 currentTick,
            uint24 fee,
            uint256 liquidity,
            uint256 amount0,
            uint256 amount1,
            uint256 totalLiquidity
        )
    {
        IUniswapLiquidityManager liquidityManager = IUniswapLiquidityManager(
            liquidityManagerAddress
        );
        IUniswapLiquidityManager.Position memory userPosition = liquidityManager
            .userPositions(tokenId);
        (amount0, amount1, totalLiquidity) = liquidityManager
            .updatePositionTotalAmounts(userPosition.pool);
        (token0, token1, fee, , , , currentTick) = getPoolDetails(
            userPosition.pool
        );
        pool = userPosition.pool;
        liquidity = userPosition.liquidity;
    }

    function getPoolDetails(address pool)
        public
        view
        returns (
            address token0,
            address token1,
            uint24 fee,
            uint16 poolCardinality,
            uint128 liquidity,
            uint160 sqrtPriceX96,
            int24 currentTick
        )
    {
        IUniswapV3Pool uniswapPool = IUniswapV3Pool(pool);
        token0 = uniswapPool.token0();
        token1 = uniswapPool.token1();
        fee = uniswapPool.fee();
        liquidity = uniswapPool.liquidity();
        (sqrtPriceX96, currentTick, , poolCardinality, , , ) = uniswapPool
            .slot0();
    }
}
