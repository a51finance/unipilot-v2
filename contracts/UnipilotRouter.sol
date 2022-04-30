//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotVault.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/external/IWETH9.sol";
import "./interfaces/IUnipilotFactory.sol";
import "./libraries/UniswapPoolActions.sol";
import "./base/PeripheryPayments.sol";

contract UnipilotRouter is PeripheryPayments {
    struct RefundLiquidityParams {
        address vault;
        address token0;
        address token1;
        uint256 amount0Unipilot;
        uint256 amount1Unipilot;
        uint256 amount0Recieved;
        uint256 amount1Recieved;
        bool refundAsETH;
    }

    address public unipilotActiveFactory;
    address public unipilotPassiveFactory;

    constructor(address _unipilotActiveFactory, address _unipilotPassiveFactory)
    {
        unipilotActiveFactory = _unipilotActiveFactory;
        unipilotPassiveFactory = _unipilotPassiveFactory;
    }

    modifier checkDeviation(address pool, bool isActive) {
        _getStrategy(pool, isActive);
        _;
    }

    function deposit(
        address pool,
        address vault,
        uint256 amount0Desired,
        uint256 amount1Desired,
        address recipient,
        bool isActiveVault
    )
        external
        payable
        checkDeviation(pool, isActiveVault)
        returns (uint256 amount0, uint256 amount1)
    {
        IUniswapV3Pool pool = IUniswapV3Pool(pool);
        address caller = msg.sender;
        address token0 = pool.token0();
        address token1 = pool.token1();

        pay(token0, caller, address(this), amount0Desired);
        pay(token1, caller, address(this), amount1Desired);

        _tokenApproval(token0, vault, amount0Desired);
        _tokenApproval(token1, vault, amount1Desired);

        (, amount0, amount1) = IUnipilotVault(vault).deposit(
            amount0Desired,
            amount1Desired,
            recipient
        );

        refundETH();

        _refundRemainingLiquidity(
            RefundLiquidityParams(
                vault,
                token0,
                token1,
                amount0,
                amount1,
                amount0Desired,
                amount1Desired,
                true
            ),
            caller
        );
    }

    function _refundRemainingLiquidity(
        RefundLiquidityParams memory params,
        address _msgSender
    ) internal {
        if (params.amount0Unipilot < params.amount0Recieved) {
            if (params.refundAsETH && params.token0 == WETH) {
                unwrapWETH9(0, _msgSender);
            } else {
                sweepToken(params.token0, 0, _msgSender);
            }
        }
        if (params.amount1Unipilot < params.amount1Recieved) {
            if (params.refundAsETH && params.token1 == WETH) {
                unwrapWETH9(0, _msgSender);
            } else {
                sweepToken(params.token1, 0, _msgSender);
            }
        }
    }

    function _getStrategy(address pool, bool isActive)
        internal
        returns (address strategy)
    {
        if (isActive) {
            (, strategy) = _getProtocolDetails(unipilotActiveFactory);
            IUnipilotStrategy(strategy).checkDeviation(address(pool));
        } else {
            (, strategy) = _getProtocolDetails(unipilotPassiveFactory);
            IUnipilotStrategy(strategy).checkDeviation(address(pool));
        }
    }

    function _getProtocolDetails(address _factory)
        internal
        returns (address _governance, address _strategy)
    {
        (_governance, _strategy, , , ) = IUnipilotFactory(_factory)
            .getUnipilotDetails();
    }

    function _tokenApproval(
        address _token,
        address _vault,
        uint256 _amount
    ) internal {
        TransferHelper.safeApprove(_token, _vault, _amount);
    }
}
