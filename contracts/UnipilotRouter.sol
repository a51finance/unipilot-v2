pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotVault.sol";

contract UnipilotRouter {
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

        (address token0, address token1, uint256 fee) = IUnipilotVault(_vault)
            .getVaultInfo();

        require(
            IUnipilotFactory(unipilotFactory).getVaults(
                token0,
                token1,
                uint24(fee)
            ) != address(0),
            "NVA"
        );

        lpShares = IUnipilotVault(_vault).deposit(
            msg.sender,
            _recipient,
            _amount0,
            _amount1
        );
    }

    // Withdraw goes to here...

    // Rebase goes to here...
}
