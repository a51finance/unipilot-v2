//SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

interface IUnipilotFactory {
    event VaultCreated(
        address indexed _tokenA,
        address indexed _tokenB,
        uint24 fee
    );

    event OwnerChanged(address indexed _oldOwner, address indexed _newOwner);

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

    function setOwner(address _newOwner) external;

    function owner() external view returns (address);
}
