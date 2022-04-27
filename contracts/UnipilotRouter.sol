//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotVault.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/external/IWETH9.sol";
import "./interfaces/IUnipilotFactory.sol";

import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";
import "./base/PeripheryPayments.sol";

contract UnipilotRouter is PeripheryPayments {
    using UniswapPoolActions for IUniswapV3Pool;
    // using UniswapLiquidityManagement for IUniswapV3Pool;
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

    address public governance;
    address public unipilotActiveFactory;
    address public unipilotPassiveFactory;

    constructor(address _unipilotActiveFactory, address _unipilotPassiveFactory)
    {
        governance = msg.sender;
        unipilotActiveFactory = _unipilotActiveFactory;
        unipilotPassiveFactory = _unipilotPassiveFactory;
    }

    modifier checkDeviation(address pool, bool isActive) {
        if (isActive) {
            IUnipilotStrategy(_getProtocolDetails(unipilotActiveFactory))
                .checkDeviation(address(pool));
        } else if (!isActive) {
            IUnipilotStrategy(_getProtocolDetails(unipilotPassiveFactory))
                .checkDeviation(address(pool));
        }
        _;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "NA");
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

    function updateFactory(address newFactory, bool isActive)
        external
        onlyGovernance
    {
        if (isActive) {
            unipilotActiveFactory = newFactory;
        } else {
            unipilotPassiveFactory = newFactory;
        }
    }

    function updateGovernance(address newGovernance) external onlyGovernance {
        governance = newGovernance;
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

    function _getProtocolDetails(address factory)
        internal
        returns (address strategy)
    {
        (, strategy, , , ) = IUnipilotFactory(factory).getUnipilotDetails();
    }

    function _tokenApproval(
        address _token,
        address _vault,
        uint256 _amount
    ) internal {
        TransferHelper.safeApprove(_token, _vault, _amount);
    }
}
