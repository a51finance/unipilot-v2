//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

interface IUnipilotVault {
    event Deposit(
        address depositor,
        uint256 amount0,
        uint256 amount1,
        uint256 lpShares
    );

    function deposit(
        address depositor,
        address recipient,
        uint256 amount0,
        uint256 amount1
    ) external returns (uint256 lpShares);
}
