//SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

interface IUnipilotDeployer {
    function parameters()
        external
        view
        returns (
            address factory,
            address tokenA,
            address tokenB,
            uint24 fee
        );
}