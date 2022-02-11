//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotVault.sol";
import "./base/PeripheryPayments.sol";

contract UnipilotRouter is PeripheryPayments {
    address private unipilotFactory;
    address private governance;
    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    constructor(address _governance) {
        governance = _governance;
    }

    // function deposit(
    //     address _vault,
    //     address _recipient,
    //     uint256 _amount0,
    //     uint256 _amount1
    // ) external returns (uint256 lpShares) {
    //     require(_vault != address(0) && _recipient != address(0), "NA");
    //     require(_amount0 > 0 && _amount1 > 0);
    //     (address token0, address token1, uint256 fee) = IUnipilotVault(_vault)
    //         .getVaultInfo();

    //     lpShares = IUnipilotVault(_vault).deposit(
    //         msg.sender,
    //         _recipient,
    //         _amount0,
    //         _amount1
    //     );

    //     pay(_token0, _depositor, caller, _amount0);
    //     pay(_token1, _depositor, caller, _amount1);
    // }

    // function vaultPayCallback(
    //     address _depositor,
    //     address _token0,
    //     address _token1,
    //     uint256 _amount0,
    //     uint256 _amount1,
    //     uint24 _fee
    // ) external {
    //     address caller = msg.sender;
    //     (address vault, ) = IUnipilotFactory(unipilotFactory).getVaults(
    //         _token0,
    //         _token1,
    //         _fee
    //     );
    //     require(caller == vault);

    // }

    // function setFactory(address _factory) external onlyGovernance {
    //     require(_factory != address(0));
    //     unipilotFactory = _factory;
    // }

    // function withdraw(
    //     address _vault,
    //     uint256 liquidity,
    //     address _recipient
    // ) external returns (uint256 amount0, uint256 amount1) {
    //     require(_vault != address(0) || _recipient != address(0));
    //     (amount0, amount1) = IUnipilotVault(_vault).withdraw(
    //         liquidity,
    //         _recipient
    //     );
    // }

    // function readjustLiquidity(address _vault) external {
    //     IUnipilotVault(_vault).readjustLiquidity();
}
