// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "../base/PeripheryImmutableState.sol";

contract PeripheryImmutableStateTest is PeripheryImmutableState {
    constructor(
        address _deployer,
        address _factory,
        address _WETH9
    ) PeripheryImmutableState(_deployer, _factory, _WETH9) {}
}
