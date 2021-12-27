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
    ) external returns (address _vault);

    function getVaults(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) external view returns (address _vault);

    function setGovernance(address _newGovernance) external;

    function governance() external view returns (address);
}
