//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotVault.sol";
import "./libraries/TransferHelper.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";
import "./interfaces/external/IWETH9.sol";

contract UnipilotRouter {
    using UniswapPoolActions for IUniswapV3Pool;
    using UniswapLiquidityManagement for IUniswapV3Pool;
    IUnipilotFactory private unipilotFactory;
    address public WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    constructor(address _unipilotFactory) {
        unipilotFactory = IUnipilotFactory(_unipilotFactory);
    }

    modifier checkDeviation(address pool, address vault) {
        (, address strategy, , , ) = getProtocolDetails();
        IUnipilotStrategy(strategy).checkDeviation(address(pool));
        _;
    }

    function deposit(
        address _pool,
        address vault,
        uint256 amount0Desired,
        uint256 amount1Desired,
        address recipient
    )
        external
        checkDeviation(_pool, vault)
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3Pool pool = IUniswapV3Pool(_pool);
        address token0 = address(IERC20(pool.token0()));
        address token1 = address(IERC20(pool.token1()));

        (, amount0Desired, , amount1Desired) = _sortTokenAmount(
            token0,
            token1,
            amount0Desired,
            amount1Desired
        );

        pay(address(token0), msg.sender, address(this), amount0Desired);
        pay(address(token1), msg.sender, address(this), amount1Desired);

        IERC20(token0).approve(vault, amount0Desired);
        IERC20(token1).approve(vault, amount1Desired);

        (lpShares, amount0, amount1) = IUnipilotVault(vault).deposit(
            amount0Desired,
            amount1Desired,
            recipient
        );
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

    function pay(
        address token,
        address payer,
        address recipient,
        uint256 value
    ) internal {
        if (token == WETH && address(this).balance >= value) {
            // pay with WETH9
            IWETH9(WETH).deposit{ value: value }(); // wrap only what is needed to pay
            IWETH9(WETH).transfer(recipient, value);
        } else if (payer == address(this)) {
            // pay with tokens already in the contract (for the exact input multihop case)
            TransferHelper.safeTransfer(token, recipient, value);
        } else {
            // pull payment
            TransferHelper.safeTransferFrom(token, payer, recipient, value);
        }
    }

    function _sortTokenAmount(
        address _token0,
        address _token1,
        uint256 _amount0,
        uint256 _amount1
    )
        private
        view
        returns (
            address tokenAlt1,
            uint256 altAmount1,
            address tokenAlt2,
            uint256 altAmount2
        )
    {
        (tokenAlt1, altAmount1, tokenAlt2, altAmount2) = _token0 < _token1
            ? (_token0, _amount0, _token1, _amount1)
            : (_token1, _amount1, _token0, _amount0);
    }
}
