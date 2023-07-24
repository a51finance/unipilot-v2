// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import "../interfaces/IERC20Minimal.sol";

import "../interfaces/callback/IPancakeV3SwapCallback.sol";
import "../interfaces/IPancakeV3Pool.sol";

contract TestPancakeV3SwapPay is IPancakeV3SwapCallback {
    function swap(
        address pool,
        address recipient,
        bool zeroForOne,
        uint160 sqrtPriceX96,
        int256 amountSpecified,
        uint256 pay0,
        uint256 pay1
    ) external {
        IPancakeV3Pool(pool).swap(
            recipient,
            zeroForOne,
            amountSpecified,
            sqrtPriceX96,
            abi.encode(msg.sender, pay0, pay1)
        );
    }

    function pancakeV3SwapCallback(
        int256,
        int256,
        bytes calldata data
    ) external override {
        (address sender, uint256 pay0, uint256 pay1) = abi.decode(
            data,
            (address, uint256, uint256)
        );

        if (pay0 > 0) {
            IERC20Minimal(IPancakeV3Pool(msg.sender).token0()).transferFrom(
                sender,
                msg.sender,
                uint256(pay0)
            );
        } else if (pay1 > 0) {
            IERC20Minimal(IPancakeV3Pool(msg.sender).token1()).transferFrom(
                sender,
                msg.sender,
                uint256(pay1)
            );
        }
    }
}
