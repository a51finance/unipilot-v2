//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "./TransferHelper.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

library UnipilotMaths {
    using SafeMath for uint256;
    uint256 public constant PRECISION = 1e36;

    function getCurrentPrice(int24 tick) internal view returns (uint256 price) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        price = FullMath.mulDiv(
            uint256(sqrtRatio).mul(uint256(sqrtRatio)),
            PRECISION,
            2**(96 * 2)
        );
    }

    function currentTick(IUniswapV3Pool pool)
        internal
        view
        returns (int24 tick)
    {
        (, tick, , , , , ) = pool.slot0();
    }

    function getShares(
        uint256 totalAmount0,
        uint256 totalAmount1,
        uint256 totalSupply,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) internal view returns (uint256 shares) {
        assert(totalSupply == 0 || totalAmount0 > 0 || totalAmount1 > 0);

        if (totalSupply == 0) {
            shares = Math.max(amount0Desired, amount1Desired);
        } else if (totalAmount0 == 0) {
            shares = amount1Desired.mul(totalSupply).div(totalAmount1);
        } else if (totalAmount1 == 0) {
            shares = amount0Desired.mul(totalSupply).div(totalAmount0);
        } else {
            uint256 cross = Math.min(
                amount0Desired.mul(totalAmount1),
                amount1Desired.mul(totalAmount0)
            );
             
        }
    }
}
