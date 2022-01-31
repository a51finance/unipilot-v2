pragma solidity ^0.7.6;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Token {
    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);
}
