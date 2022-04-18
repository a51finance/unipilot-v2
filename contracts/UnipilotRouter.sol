//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotVault.sol";

contract UnipilotRouter {
    IUnipilotFactory private unipilotFactory;

    constructor(address _unipilotFactory) {
        unipilotFactory = IUnipilotFactory(_unipilotFactory);
    }

    modifier checkDeviation(address pool, address vault) {
        (, address strategy, , , ) = getProtocolDetails();
        IUnipilotStrategy(strategy).checkDeviation(address(pool));
        _;
    }

    function getProtocolDetails()
        internal
        view
        returns (
            address governance,
            address strategy,
            address indexFund,
            uint8 indexFundPercentage,
            uint8 swapPercentage
        )
    {
        return unipilotFactory.getUnipilotDetails();
    }

    function deposit(
        address pool,
        address vault,
        uint256 amount0Desired,
        uint256 amount1Desired,
        address recipient
    )
        external
        checkDeviation(pool, vault)
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        (lpShares, amount0, amount1) = IUnipilotVault(vault).deposit(
            amount0Desired,
            amount1Desired,
            recipient
        );
    }
}
