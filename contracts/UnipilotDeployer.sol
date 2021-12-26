//SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./interfaces/IUnipilotDeployer.sol";

// import "./UnipilotVault.sol";

contract UnipilotDeployer is IUnipilotDeployer {
    struct Parameters {
        address factory;
        address tokenA;
        address tokenB;
        uint24 fee;
    }

    Parameters public override parameters;

    // function deploy(
    //     address _factory,
    //     address _tokenA,
    //     address _tokenB,
    //     uint24 _fee
    // ) internal returns (address _vault) {
    //     parameters = Parameters({ factory: _factory, tokenA: _tokenA, tokenB: _tokenB, fee: _fee });
    //     // _vault = address(new UnipilotVault{salt: keccak256(abi.encode(_tokenA, _tokenB, _fee))}());
    //     delete parameters;
    // }
}
