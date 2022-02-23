// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "./IERC20Permit.sol";

interface IERC20 is IERC20Permit {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function mint(address to, uint256 value) external;

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function burn(uint256 value) external returns (bool);
}
