// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;

interface IUnipilotTokenProxy {
    event TimelockUpdated(address previousTimelock, address newTimelock);
    event MinterUpdated(address minter, bool status);

    function updateTimelock(address _timelock) external;

    function updateMinter(address _minter) external;

    function mint(address _to, uint256 _value) external;
}
