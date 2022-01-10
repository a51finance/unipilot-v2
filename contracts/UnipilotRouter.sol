pragma solidity ^0.7.6;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotVault.sol";
import "./base/PeripheryPayments.sol";

//import "hardhat/console.sol";

contract UnipilotRouter is PeripheryPayments {
    address private unipilotFactory;
    address private owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "NO");
        _;
    }

    constructor() {
        owner = msg.sender;
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

    function setFactory(address _factory) external onlyOwner {
        unipilotFactory = _factory;
    }

    function withdraw(
        address _vault,
        uint256 liquidity,
        address _recipient
    ) external returns (uint256 amount0, uint256 amount1) {
        require(_vault != address(0) || _recipient != address(0));
        (amount0, amount1) = IUnipilotVault(_vault).withdraw(
            liquidity,
            _recipient
        );
    }

    function readjustLiquidity(address _vault) external {
        IUnipilotVault(_vault).readjustLiquidity();
    }
}
