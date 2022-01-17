//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IUnipilotFactory {
    event VaultCreated(
        address indexed _tokenA,
        address indexed _tokenB,
        uint24 fee
    );

    event GovernanceChanged(
        address indexed _oldGovernance,
        address indexed _newGovernance
    );

    function createVault(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint160 _sqrtPriceX96,
        string memory _name,
        string memory _symbol
    ) external returns (address _vault, address _pool);

    function getVaults(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) external view returns (address _vault, bool _whitelisted);

    function getUnipilotDetails()
        external
        view
        returns (
            address governance,
            address strategy,
            address indexFund
        );
}
