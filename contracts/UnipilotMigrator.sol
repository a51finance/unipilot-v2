// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.7.6;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Context.sol";

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IUnipilotVault.sol";
import "./interfaces/external/IWETH9.sol";

import "./interfaces/IUnipilotMigrator.sol";

import "./libraries/TransferHelper.sol";
import "./base/PeripheryPayments.sol";

import "./interfaces/external/IUniswapLiquidityManager.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";

import "./interfaces/popsicle-interfaces/IPopsicleV3Optimizer.sol";
import "./interfaces/visor-interfaces/IVault.sol";

import "./interfaces/lixir-interfaces/ILixirVaultETH.sol";
import "./interfaces/external/IUnipilot.sol";

/// @title Uniswap V2, V3, Sushiswap, Visor, Lixir, Popsicle Liquidity Migrator
contract UnipilotMigrator is
    IUnipilotMigrator,
    PeripheryPayments,
    IERC721Receiver,
    Context
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address private immutable ulm;
    address private immutable unipilot;
    address private immutable v2Factory;
    address private immutable uniswapFactory;
    address private immutable positionManager;

    constructor(
        address _positionManager,
        address _uniswapFactory,
        address _unipilot,
        address _v2Factory,
        address _ulm
    ) {
        positionManager = _positionManager;
        uniswapFactory = _uniswapFactory;
        unipilot = _unipilot;
        v2Factory = _v2Factory;
        ulm = _ulm;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC721Receiver(0).onERC721Received.selector;
    }

    function migrateUnipilotLiquididty(UnipilotMigrateParams memory params)
        external
    {
        IUniswapLiquidityManager.Position
            memory userPosition = IUniswapLiquidityManager(ulm).userPositions(
                params.tokenId
            );

        IExchangeManager.WithdrawParams memory withdrawParam = IExchangeManager
            .WithdrawParams({
                pilotToken: false,
                wethToken: false,
                exchangeManagerAddress: ulm,
                liquidity: userPosition.liquidity,
                tokenId: params.tokenId
            });

        IUnipilot(unipilot).withdraw(
            withdrawParam,
            abi.encode(params.recipient)
        );

        IERC721(unipilot).safeTransferFrom(
            msg.sender,
            address(this),
            params.tokenId
        );

        uint256 amount0 = IERC20(params.token0).balanceOf(address(this));
        uint256 amount1 = IERC20(params.token1).balanceOf(address(this));

        require(amount0 > 0 && amount1 > 0, "IF");

        _tokenApproval(params.token0, params.vault, amount0);
        _tokenApproval(params.token1, params.vault, amount1);

        (
            ,
            uint256 amount0Unipilot,
            uint256 amount1Unipilot
        ) = _addLiquidityUnipilot(params.vault, amount0, amount1, msg.sender);

        if (amount0 > amount0Unipilot) {
            IERC20(params.token0).transfer(
                msg.sender,
                amount0.sub(amount0Unipilot)
            );
        }
        if (amount1 > amount1Unipilot) {
            IERC20(params.token1).transfer(
                msg.sender,
                amount1.sub(amount1Unipilot)
            );
        }

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: params.token0,
                token1: params.token1,
                amount0Unipilot: amount0Unipilot,
                amount1Unipilot: amount1Unipilot,
                amount0Recieved: amount0.sub(amount0Unipilot),
                amount1Recieved: amount1.sub(amount1Unipilot),
                amount0ToMigrate: amount0,
                amount1ToMigrate: amount1,
                refundAsETH: false
            })
        );
    }

    function _addLiquidityUnipilot(
        address vault,
        uint256 amount0,
        uint256 amount1,
        address recipient
    )
        private
        returns (
            address,
            uint256,
            uint256
        )
    {
        (
            uint256 LpShare,
            uint256 despositedAmount0,
            uint256 despositedAmount1
        ) = IUnipilotVault(vault).deposit(amount0, amount1);

        // LP transfer to user
        if (LpShare > 0) {
            IERC20(vault).safeTransfer(recipient, LpShare);
        }

        return (vault, despositedAmount0, despositedAmount1);
    }

    function migrateV2Liquidity(MigrateV2Params calldata params) external {
        require(
            params.percentageToMigrate > 0 && params.percentageToMigrate <= 100,
            "IPA"
        );

        IUniswapV2Pair(params.pair).transferFrom(
            _msgSender(),
            params.pair,
            params.liquidityToMigrate
        );

        (uint256 amount0V2, uint256 amount1V2) = IUniswapV2Pair(params.pair)
            .burn(address(this));

        uint256 amount0ToMigrate = (amount0V2.mul(params.percentageToMigrate))
            .div(100);

        uint256 amount1ToMigrate = (amount1V2.mul(params.percentageToMigrate))
            .div(100);

        _tokenApproval(params.token0, params.vault, amount0ToMigrate);

        _tokenApproval(params.token1, params.vault, amount1ToMigrate);

        (
            address pairV3,
            uint256 amount0V3,
            uint256 amount1V3
        ) = _addLiquidityUnipilot(
                params.vault,
                amount0ToMigrate,
                amount1ToMigrate,
                msg.sender
            );

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: params.token0,
                token1: params.token1,
                amount0Unipilot: amount0V3,
                amount1Unipilot: amount1V3,
                amount0Recieved: amount0V2,
                amount1Recieved: amount1V2,
                amount0ToMigrate: amount0ToMigrate,
                amount1ToMigrate: amount1ToMigrate,
                refundAsETH: params.refundAsETH
            })
        );

        emit LiquidityMigratedFromV2(
            params.pair,
            pairV3,
            _msgSender(),
            amount0V3,
            amount1V3
        );
    }

    function migrateV3Liquidity(MigrateV3Params calldata params) external {
        require(
            params.percentageToMigrate > 0 && params.percentageToMigrate <= 100,
            "IPA"
        );

        INonfungiblePositionManager periphery = INonfungiblePositionManager(
            positionManager
        );

        periphery.safeTransferFrom(
            _msgSender(),
            address(this),
            params.uniswapTokenId
        );

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint128 liquidityV3,
            ,
            ,
            ,

        ) = INonfungiblePositionManager(positionManager).positions(
                params.uniswapTokenId
            );

        periphery.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: params.uniswapTokenId,
                liquidity: liquidityV3,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 120
            })
        );

        // returns the total amount of Liquidity with collected fees to user
        (uint256 amount0V3, uint256 amount1V3) = periphery.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: params.uniswapTokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        uint256 amount0ToMigrate = (amount0V3.mul(params.percentageToMigrate))
            .div(100);

        uint256 amount1ToMigrate = (amount1V3.mul(params.percentageToMigrate))
            .div(100);
        // approve the Unipilot up to the maximum token amounts
        _tokenApproval(params.token0, params.vault, amount0ToMigrate);
        _tokenApproval(params.token1, params.vault, amount1ToMigrate);

        (
            address pair,
            uint256 amount0Unipilot,
            uint256 amount1Unipilot
        ) = _addLiquidityUnipilot(
                params.vault,
                amount0ToMigrate,
                amount1ToMigrate,
                msg.sender
            );

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: params.token0,
                token1: params.token1,
                amount0Unipilot: amount0Unipilot,
                amount1Unipilot: amount1Unipilot,
                amount0Recieved: amount0V3,
                amount1Recieved: amount1V3,
                amount0ToMigrate: amount0ToMigrate,
                amount1ToMigrate: amount1ToMigrate,
                refundAsETH: params.refundAsETH
            })
        );

        periphery.burn(params.uniswapTokenId);

        emit LiquidityMigratedFromV3(
            pair,
            _msgSender(),
            amount0Unipilot,
            amount1Unipilot
        );
    }

    function migrateVisorLiquidity(MigrateV2Params calldata params) external {
        require(
            params.percentageToMigrate > 0 && params.percentageToMigrate <= 100,
            "IPA"
        );

        IERC20(params.pair).safeTransferFrom(
            _msgSender(),
            address(this),
            params.liquidityToMigrate
        );

        (uint256 amount0V2, uint256 amount1V2) = IVault(params.pair).withdraw(
            params.liquidityToMigrate,
            address(this),
            address(this)
        );

        uint256 amount0ToMigrate = (amount0V2.mul(params.percentageToMigrate))
            .div(100);

        uint256 amount1ToMigrate = (amount1V2.mul(params.percentageToMigrate))
            .div(100);

        _tokenApproval(params.token0, params.vault, amount0ToMigrate);
        _tokenApproval(params.token1, params.vault, amount1ToMigrate);

        (
            address pairV3,
            uint256 amount0V3,
            uint256 amount1V3
        ) = _addLiquidityUnipilot(
                params.vault,
                amount0ToMigrate,
                amount1ToMigrate,
                msg.sender
            );

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: params.token0,
                token1: params.token1,
                amount0Unipilot: amount0V3,
                amount1Unipilot: amount1V3,
                amount0Recieved: amount0V2,
                amount1Recieved: amount1V2,
                amount0ToMigrate: amount0ToMigrate,
                amount1ToMigrate: amount1ToMigrate,
                refundAsETH: params.refundAsETH
            })
        );

        emit LiquidityMigratedFromVisor(
            params.pair,
            pairV3,
            _msgSender(),
            amount0V3,
            amount1V3
        );
    }

    function migrateLixirLiquidity(MigrateV2Params calldata params) external {
        require(
            params.percentageToMigrate > 0 && params.percentageToMigrate <= 100,
            "IPA"
        );

        (uint256 amount0V2, uint256 amount1V2) = ILixirVaultETH(
            payable(address(params.pair))
        ).withdrawETHFrom(
                _msgSender(),
                params.liquidityToMigrate,
                0,
                0,
                address(this),
                block.timestamp + 120
            );

        (
            address alt,
            uint256 altAmountReceived,
            address weth,
            uint256 wethAmountReceived
        ) = _sortWethAmount(params.token0, params.token1, amount0V2, amount1V2);

        IWETH9(WETH).deposit{ value: wethAmountReceived }();

        uint256 wethAmountToMigrate = (
            wethAmountReceived.mul(params.percentageToMigrate)
        ).div(100);

        uint256 altAmountToMigrate = (
            altAmountReceived.mul(params.percentageToMigrate)
        ).div(100);

        _tokenApproval(weth, params.vault, wethAmountToMigrate);
        _tokenApproval(alt, params.vault, altAmountToMigrate);

        (
            address pairV3,
            uint256 amount0V3,
            uint256 amount1V3
        ) = _addLiquidityUnipilot(
                params.vault,
                wethAmountToMigrate,
                altAmountToMigrate,
                msg.sender
            );

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: alt,
                token1: weth,
                amount0Unipilot: amount0V3,
                amount1Unipilot: amount1V3,
                amount0Recieved: altAmountReceived,
                amount1Recieved: wethAmountReceived,
                amount0ToMigrate: altAmountToMigrate,
                amount1ToMigrate: wethAmountToMigrate,
                refundAsETH: params.refundAsETH
            })
        );

        emit LiquidityMigratedFromLixir(
            params.pair,
            pairV3,
            _msgSender(),
            amount0V3,
            amount1V3
        );
    }

    function migratePopsicleLiquidity(MigrateV2Params calldata params)
        external
    {
        require(
            params.percentageToMigrate > 0 && params.percentageToMigrate <= 100,
            "IPA"
        );

        IERC20(params.pair).transferFrom(
            _msgSender(),
            address(this),
            params.liquidityToMigrate
        );

        (uint256 amount0, uint256 amount1) = IPopsicleV3Optimizer(params.pair)
            .withdraw(params.liquidityToMigrate, address(this));

        uint256 amount0ToMigrate = (amount0.mul(params.percentageToMigrate))
            .div(100);

        uint256 amount1ToMigrate = (amount1.mul(params.percentageToMigrate))
            .div(100);

        _tokenApproval(params.token0, params.vault, amount0ToMigrate);
        _tokenApproval(params.token1, params.vault, amount1ToMigrate);

        (
            address pairV3,
            uint256 amount0V3,
            uint256 amount1V3
        ) = _addLiquidityUnipilot(
                params.vault,
                amount0ToMigrate,
                amount1ToMigrate,
                msg.sender
            );

        _refundRemainingLiquidiy(
            RefundLiquidityParams({
                vault: params.vault,
                token0: params.token0,
                token1: params.token1,
                amount0Unipilot: amount0V3,
                amount1Unipilot: amount1V3,
                amount0Recieved: amount0,
                amount1Recieved: amount1,
                amount0ToMigrate: amount0ToMigrate,
                amount1ToMigrate: amount1ToMigrate,
                refundAsETH: params.refundAsETH
            })
        );

        emit LiquidityMigratedFromPopsicle(
            params.pair,
            pairV3,
            _msgSender(),
            amount0V3,
            amount1V3
        );
    }

    function _refundRemainingLiquidiy(RefundLiquidityParams memory params)
        private
    {
        if (params.amount0Unipilot < params.amount0Recieved) {
            if (params.amount0Unipilot < params.amount0ToMigrate) {
                TransferHelper.safeApprove(params.token0, params.vault, 0);
            }
            if (params.refundAsETH && params.token0 == WETH) {
                unwrapWETH9(0, _msgSender());
            } else {
                sweepToken(params.token0, 0, _msgSender());
            }
        }
        if (params.amount1Unipilot < params.amount1Recieved) {
            if (params.amount1Unipilot < params.amount1ToMigrate) {
                TransferHelper.safeApprove(params.token1, params.vault, 0);
            }
            if (params.refundAsETH && params.token1 == WETH) {
                unwrapWETH9(0, _msgSender());
            } else {
                (params.token1, 0, _msgSender());
            }
        }
    }

    function _sortWethAmount(
        address _token0,
        address _token1,
        uint256 _amount0,
        uint256 _amount1
    )
        private
        pure
        returns (
            address tokenAlt,
            uint256 altAmount,
            address tokenWeth,
            uint256 wethAmount
        )
    {
        (
            address tokenA,
            address tokenB,
            uint256 amountA,
            uint256 amountB
        ) = _token0 == WETH
                ? (_token0, _token1, _amount0, _amount1)
                : (_token0, _token1, _amount1, _amount0);

        (tokenAlt, altAmount, tokenWeth, wethAmount) = tokenA == WETH
            ? (tokenB, amountB, tokenA, amountA)
            : (tokenA, amountA, tokenB, amountB);
    }

    function _tokenApproval(
        address token,
        address vault,
        uint256 amount
    ) private {
        TransferHelper.safeApprove(token, vault, amount);
    }
}
