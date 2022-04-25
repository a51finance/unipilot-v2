//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotVault.sol";
import "./libraries/TransferHelper.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";
import "./interfaces/external/IWETH9.sol";

contract UnipilotRouter {
    using UniswapPoolActions for IUniswapV3Pool;
    using UniswapLiquidityManagement for IUniswapV3Pool;

    struct RefundLiquidityParams {
        address vault;
        address token0;
        address token1;
        uint256 amount0Unipilot;
        uint256 amount1Unipilot;
        uint256 amount0Recieved;
        uint256 amount1Recieved;
        uint256 amount0ToMigrate;
        uint256 amount1ToMigrate;
        bool refundAsETH;
    }

    address public strategy;
    address public WETH;

    constructor(address _strategy, address _weth) {
        strategy = _strategy;
        WETH = _weth;
    }

    modifier checkDeviation(address pool, address vault) {
        IUnipilotStrategy(strategy).checkDeviation(address(pool));
        _;
    }

    function deposit(
        address _pool,
        address _vault,
        uint256 _amount0Desired,
        uint256 _amount1Desired,
        address _recipient
    )
        external
        payable
        checkDeviation(_pool, _vault)
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3Pool pool = IUniswapV3Pool(_pool);
        address caller = msg.sender;
        address token0 = address(IERC20(pool.token0()));
        address token1 = address(IERC20(pool.token1()));

        pay(address(token0), caller, address(this), _amount0Desired);
        pay(address(token1), caller, address(this), _amount1Desired);

        _tokenApproval(token0, _vault, _amount0Desired);
        _tokenApproval(token1, _vault, _amount1Desired);

        (lpShares, amount0, amount1) = IUnipilotVault(_vault).deposit(
            _amount0Desired,
            _amount1Desired,
            _recipient
        );

        RefundLiquidityParams memory params = RefundLiquidityParams(
            _vault,
            token0,
            token1,
            amount0,
            amount1,
            _amount0Desired,
            _amount1Desired,
            _amount0Desired,
            _amount1Desired,
            true
        );

        _refundRemainingLiquidiy(params, caller);
    }

    function _refundRemainingLiquidiy(
        RefundLiquidityParams memory params,
        address _msgSender
    ) private {
        if (params.amount0Unipilot < params.amount0Recieved) {
            if (params.amount0Unipilot < params.amount0ToMigrate) {
                TransferHelper.safeApprove(params.token0, params.vault, 0);
            }
            if (params.refundAsETH && params.token0 == WETH) {
                unwrapWETH9(0, _msgSender);
            } else {
                sweepToken(params.token0, 0, _msgSender);
            }
        }
        if (params.amount1Unipilot < params.amount1Recieved) {
            if (params.amount1Unipilot < params.amount1ToMigrate) {
                TransferHelper.safeApprove(params.token1, params.vault, 0);
            }
            if (params.refundAsETH && params.token1 == WETH) {
                unwrapWETH9(0, _msgSender);
            } else {
                sweepToken(params.token1, 0, _msgSender);
            }
        }
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

    function unwrapWETH9(uint256 amountMinimum, address recipient) internal {
        uint256 balanceWETH9 = IWETH9(WETH).balanceOf(address(this));
        require(balanceWETH9 >= amountMinimum, "IW");

        if (balanceWETH9 > 0) {
            IWETH9(WETH).withdraw(balanceWETH9);
            TransferHelper.safeTransferETH(recipient, balanceWETH9);
        }
    }

    function sweepToken(
        address token,
        uint256 amountMinimum,
        address recipient
    ) internal {
        uint256 balanceToken = IERC20(token).balanceOf(address(this));
        require(balanceToken >= amountMinimum, "IT");
        if (balanceToken > 0) {
            TransferHelper.safeTransfer(token, recipient, balanceToken);
        }
    }

    function _tokenApproval(
        address _token,
        address _vault,
        uint256 _amount
    ) private {
        TransferHelper.safeApprove(_token, _vault, _amount);
    }
}
