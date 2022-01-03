pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotVault.sol";
import "./base/PeripheryPayments.sol";

import "hardhat/console.sol";

contract UnipilotRouter is PeripheryPayments {
    address public unipilotFactory;

    constructor(address _unipilotFactory) {
        unipilotFactory = _unipilotFactory;
    }

    function deposit(
        address _vault,
        address _recipient,
        uint256 _amount0,
        uint256 _amount1
    ) external returns (uint256 lpShares) {
        require(_vault != address(0) && _recipient != address(0), "NA");
        require(_amount0 > 0 && _amount1 > 0, "IF");

        (address token0, address token1, uint256 fee) = IUnipilotVault(_vault)
            .getVaultInfo();

        pay(token0, msg.sender, _vault, _amount0);
        pay(token1, msg.sender, _vault, _amount1); 

        lpShares = IUnipilotVault(_vault).deposit(
            msg.sender,
            _recipient,
            _amount0,
            _amount1
        );
    }

    // Withdraw goes to here...
    // function withdraw(address _vault,uint256 desiredAmount ) external returns (uint256 amount, uint256 lpShares){
    //     require(_vault != address(0) && desiredAmount > 0, "NA");

    //     (amount, lpShares) = IUnipilotVault(_vault).withdraw(desiredAmount);
    // }

    // Rebase goes to here...
}
