//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IUnipilotVault {
    struct ReadjustVars {
        uint256 fees0;
        uint256 fees1;
        int24 currentTick;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint128 liquidity;
        uint256 amount0;
        uint256 amount1;
        bool zeroForOne;
        int256 amountSpecified;
        uint160 exactSqrtPriceImpact;
        uint160 sqrtPriceLimitX96;
    }

    struct TicksData {
        int24 baseTickLower;
        int24 baseTickUpper;
        int24 rangeTickLower;
        int24 rangeTickUpper;
    }

    struct Tick {
        int24 baseTickLower;
        int24 baseTickUpper;
        int24 bidTickLower;
        int24 bidTickUpper;
        int24 rangeTickLower;
        int24 rangeTickUpper;
    }

    struct Cache {
        uint256 totalSupply;
        uint256 liquidityShare;
    }

    event Deposit(
        address depositor,
        uint256 amount0,
        uint256 amount1,
        uint256 lpShares
    );

    event FeesSnapshot(
        uint256 fees0,
        uint256 fees1,
        uint256 balance0,
        uint256 balance1,
        uint256 totalSupply
    );

    event Withdraw(
        address indexed recipient,
        uint256 shares,
        uint256 amount0,
        uint256 amount1
    );

    event CompoundFees(uint256 amount0, uint256 amount1);

    function deposit(uint256 _amount0Desired, uint256 _amount1Desired)
        external
        payable
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        );

    function withdraw(
        uint256 liquidity,
        address recipient,
        bool refundAsETH
    ) external returns (uint256 amount0, uint256 amount1);

    /// @notice Pull in tokens from sender. Called to `msg.sender` after minting liquidity to a position from IUniswapV3Pool#mint.
    /// @dev In the implementation you must pay to the pool for the minted liquidity.
    /// @param amount0Owed The amount of token0 due to the pool for the minted liquidity
    /// @param amount1Owed The amount of token1 due to the pool for the minted liquidity
    /// @param data Any data passed through by the caller via the IUniswapV3PoolActions#mint call
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external;

    /// @notice Called to `msg.sender` after minting swaping from IUniswapV3Pool#swap.
    /// @dev In the implementation you must pay to the pool for swap.
    /// @param amount0Delta The amount of token0 due to the pool for the swap
    /// @param amount1Delta The amount of token1 due to the pool for the swap
    /// @param data Any data passed through by the caller via the IUniswapV3PoolActions#swap call
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;

    function readjustLiquidity() external;
}
