//SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

import "./interfaces/IUnipilotDeployer.sol";

import "./UnipilotVault.sol";

contract UnipilotDeployer is IUnipilotDeployer {
    struct Parameters {
        address factory;
        address tokenA;
        address tokenB;
        uint24 fee;
    }

    Parameters public override parameters;

    function deploy(
        address _governance,
        address _pool,
        string memory _name,
        string memory _symbol
    ) internal returns (address _vault) {
        _vault = address(
            new UnipilotVault{
                salt: keccak256(abi.encode(_governance, _pool, _name, _symbol))
            }(_governance, _pool, _name, _symbol)
        );
    }
}
