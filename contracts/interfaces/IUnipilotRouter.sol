//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IUnipilotRouter {
    function deposit(
        address _vault,
        address _recipient,
        uint256 _amount0,
        uint256 _amount1
    ) external returns (uint256 lpShares);

    // function withdraw(
    //     address _vault,
    //     uint256 liquidity,
    //     address _recipient
    // ) external returns (uint256 amount0, uint256 amount1);

    function readjustLiquidity(address _vault) external;

    function vaultPayCallback(
        address _depositor,
        address _token0,
        address _token1,
        uint256 _amount0,
        uint256 _amount1,
        uint24 _fee
    ) external;
}
