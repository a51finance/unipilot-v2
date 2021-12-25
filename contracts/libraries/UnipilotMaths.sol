//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "./TransferHelper.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

library UnipilotMaths {
    using SafeMath for uint256;
    uint256 public constant PRECISION = 1e36;

    function getCurrentPrice(int24 tick) external returns (uint256 price) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        price = FullMath.mulDiv(
            uint256(sqrtRatio).mul(uint256(sqrtRatio)),
            PRECISION,
            2**(96 * 2)
        );
    }

    function currentTick(IUniswapV3Pool pool)
        external
        view
        returns (int24 tick)
    {
        (, tick, , , , , ) = pool.slot0();
    }
}
