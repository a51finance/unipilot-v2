// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

interface IOracle {
    event UniStrategyUpdated(address oldStrategy, address newStrategy);
    event GovernanceUpdated(address governance, address _governance);

    function getPilotAmountForTokens(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        address oracle0,
        address oracle1
    ) external view returns (uint256 total);

    function getPilotAmountWethPair(
        address tokenAlt,
        uint256 altAmount,
        uint256 wethAmount,
        address altOracle
    ) external view returns (uint256 amount);

    function getPilotAmount(
        address token,
        uint256 amount,
        address pool
    ) external view returns (uint256 pilotAmount);

    function assetToEth(
        address token,
        address pool,
        uint256 amountIn
    ) external view returns (uint256 ethAmountOut);

    function ethToAsset(
        address tokenOut,
        address pool,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    function getPrice(
        address tokenA,
        address tokenB,
        address pool,
        uint256 _amountIn
    ) external view returns (uint256 amountOut);
}
