//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./libraries/TransferHelper.sol";
import "./interfaces/external/IWETH9.sol";
import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotFactory.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";

import "@openzeppelin/contracts/drafts/ERC20Permit.sol";

contract UnipilotPassiveVault is ERC20Permit, IUnipilotVault {
    using LowGasSafeMath for uint256;
    using UniswapPoolActions for IUniswapV3Pool;
    using UniswapLiquidityManagement for IUniswapV3Pool;

    IERC20 private token0;
    IERC20 private token1;
    IUniswapV3Pool private pool;
    IUnipilotFactory private unipilotFactory;

    address private WETH;
    TicksData public ticksData;
    int24 private tickSpacing;
    uint8 private _unlocked = 1;
    uint24 private fee;

    modifier onlyGovernance() {
        (address governance, , , ) = getProtocolDetails();
        require(msg.sender == governance);
        _;
    }

    modifier nonReentrant() {
        require(_unlocked == 1);
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    modifier checkDeviation() {
        (, address strategy, , ) = getProtocolDetails();
        IUnipilotStrategy(strategy).checkDeviation(address(pool));
        _;
    }

    constructor(
        address _pool,
        address _unipilotFactory,
        address _WETH,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        WETH = _WETH;
        unipilotFactory = IUnipilotFactory(_unipilotFactory);
        pool = IUniswapV3Pool(_pool);
        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        fee = pool.fee();
        tickSpacing = pool.tickSpacing();
    }

    function deposit(uint256 amount0Desired, uint256 amount1Desired)
        external
        payable
        override
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        address sender = _msgSender();
        uint256 totalSupply = totalSupply();

        (lpShares, amount0, amount1) = pool.computeLpShares(
            false,
            amount0Desired,
            amount1Desired,
            _balance0(),
            _balance1(),
            totalSupply,
            ticksData
        );

        pay(address(token0), sender, address(this), amount0);
        pay(address(token1), sender, address(this), amount1);

        if (totalSupply == 0) {
            setPassivePositions(amount0Desired, amount1Desired);
        } else {
            (uint256 amount0Base, uint256 amount1Base) = pool.mintLiquidity(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                amount0Desired,
                amount1Desired
            );

            pool.mintLiquidity(
                ticksData.rangeTickLower,
                ticksData.rangeTickUpper,
                amount0Desired.sub(amount0Base),
                amount1Desired.sub(amount1Base)
            );
        }

        _mint(sender, lpShares);
        emit Deposit(sender, amount0, amount1, lpShares);
    }

    function readjustLiquidity() external override checkDeviation {
        (, , , , uint128 totalLiquidity) = pool.getTotalAmounts(
            false,
            ticksData
        );

        uint256 amount0;
        uint256 amount1;

        if (totalLiquidity > 0) {
            (
                uint256 baseAmount0,
                uint256 baseAmount1,
                uint256 baseFees0,
                uint256 baseFees1
            ) = pool.burnLiquidity(
                    ticksData.baseTickLower,
                    ticksData.baseTickUpper,
                    address(this)
                );

            (
                uint256 rangeAmount0,
                uint256 rangeAmount1,
                uint256 rangeFees0,
                uint256 rangeFees1
            ) = pool.burnLiquidity(
                    ticksData.rangeTickLower,
                    ticksData.rangeTickUpper,
                    address(this)
                );

            (uint256 fees0, uint256 fees1) = (
                baseFees0.add(rangeFees0),
                baseFees1.add(rangeFees1)
            );

            transferFeesToIF(true, fees0, fees1);

            amount0 = baseAmount0.add(rangeAmount0);
            amount1 = baseAmount1.add(rangeAmount1);

            if (amount0 == 0 || amount1 == 0) {
                bool zeroForOne = amount0 > 0 ? true : false;

                int256 amountSpecified = zeroForOne
                    ? int256(FullMath.mulDiv(amount0, 50, 100))
                    : int256(FullMath.mulDiv(amount1, 50, 100));

                pool.swapToken(address(this), zeroForOne, amountSpecified);
            }
        }

        /// @dev to add remaining amounts in contract other than positoin liquidity && when positions are empty
        amount0 = _balance0();
        amount1 = _balance1();

        setPassivePositions(amount0, amount1);
    }

    // temperory function to check position fees and reserves
    function getPositionDetails()
        external
        onlyGovernance
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 fees0,
            uint256 fees1,
            uint128 totalLiquidity
        )
    {
        return pool.getTotalAmounts(false, ticksData);
    }

    function setPassivePositions(
        uint256 _amount0Desired,
        uint256 _amount1Desired
    ) internal returns (uint256 amount0, uint256 amount1) {
        Tick memory ticks;
        (
            ticks.baseTickLower,
            ticks.baseTickUpper,
            ticks.bidTickLower,
            ticks.bidTickUpper,
            ticks.rangeTickLower,
            ticks.rangeTickUpper
        ) = _getTicksFromUniStrategy(address(pool));

        (amount0, amount1) = pool.mintLiquidity(
            ticks.baseTickLower,
            ticks.baseTickUpper,
            _amount0Desired,
            _amount1Desired
        );

        ticksData.baseTickLower = ticks.baseTickLower;
        ticksData.baseTickUpper = ticks.baseTickUpper;

        uint256 remainingAmount0 = _amount0Desired.sub(amount0);
        uint256 remainingAmount1 = _amount1Desired.sub(amount1);

        uint128 rangeLiquidity;
        if (remainingAmount0 > 0 || remainingAmount1 > 0) {
            uint128 range0 = pool.getLiquidityForAmounts(
                remainingAmount0,
                remainingAmount1,
                ticks.bidTickLower,
                ticks.bidTickUpper
            );
            uint128 range1 = pool.getLiquidityForAmounts(
                remainingAmount0,
                remainingAmount1,
                ticks.rangeTickLower,
                ticks.rangeTickUpper
            );
            /// only one range position will ever have liquidity (if any)
            if (range1 < range0) {
                rangeLiquidity = range0;
                ticksData.rangeTickLower = ticks.bidTickLower;
                ticksData.rangeTickUpper = ticks.bidTickUpper;
            } else if (range0 < range1) {
                ticksData.rangeTickLower = ticks.rangeTickLower;
                ticksData.rangeTickUpper = ticks.rangeTickUpper;
                rangeLiquidity = range1;
            }
        }

        if (rangeLiquidity > 0) {
            (uint256 _rangeAmount0, uint256 _rangeAmount1) = pool.mintLiquidity(
                ticksData.rangeTickLower,
                ticksData.rangeTickUpper,
                remainingAmount0,
                remainingAmount1
            );
            amount0 = amount0.add(_rangeAmount0);
            amount1 = amount1.add(_rangeAmount1);
        }
    }

    function withdraw(
        uint256 liquidity,
        address recipient,
        bool refundAsETH
    )
        external
        override
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0);

        (, , , , uint128 totalLiquidity) = pool.getTotalAmounts(
            false,
            ticksData
        );

        if (totalLiquidity > 0) {
            uint256 liquidityShare = FullMath.mulDiv(
                liquidity,
                1e18,
                totalSupply()
            );

            (uint256 base0, uint256 base1) = burnAndCollect(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                liquidityShare
            );

            (uint256 range0, uint256 range1) = burnAndCollect(
                ticksData.rangeTickLower,
                ticksData.rangeTickUpper,
                liquidityShare
            );

            amount0 = base0.add(range0);
            amount1 = base1.add(range1);
        }

        uint256 unusedAmount0 = FullMath.mulDiv(
            _balance0().sub(amount0),
            liquidity,
            totalSupply()
        );

        uint256 unusedAmount1 = FullMath.mulDiv(
            _balance1().sub(amount1),
            liquidity,
            totalSupply()
        );

        amount0 = amount0.add(unusedAmount0);
        amount1 = amount1.add(unusedAmount1);

        if (amount0 > 0) {
            transferFunds(refundAsETH, recipient, address(token0), amount0);
        }
        if (amount1 > 0) {
            transferFunds(refundAsETH, recipient, address(token1), amount1);
        }

        (uint256 c0, uint256 c1) = pool.mintLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            _balance0(),
            _balance1()
        );

        (uint256 r0, uint256 r1) = pool.mintLiquidity(
            ticksData.rangeTickLower,
            ticksData.rangeTickUpper,
            _balance0(),
            _balance1()
        );

        _burn(msg.sender, liquidity);
        emit Withdraw(recipient, liquidity, amount0, amount1);
        emit CompoundFees(c0.add(r0), c1.add(r1));
    }

    function burnAndCollect(
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidityShare
    ) private returns (uint256 burnt0, uint256 burnt1) {
        (burnt0, burnt1) = pool.burnUserLiquidity(
            tickLower,
            tickUpper,
            liquidityShare,
            address(this)
        );

        (uint256 fees0, uint256 fees1) = pool.collectPendingFees(
            address(this),
            tickLower,
            tickUpper
        );

        transferFeesToIF(false, fees0, fees1);
    }

    function pullLiquidity() external onlyGovernance {
        pool.burnLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            address(this)
        );

        pool.burnLiquidity(
            ticksData.rangeTickLower,
            ticksData.rangeTickUpper,
            address(this)
        );
    }

    function getVaultInfo()
        external
        view
        returns (
            address,
            address,
            uint24,
            address
        )
    {
        return (address(token0), address(token1), fee, address(pool));
    }

    /// @dev fetches the new ticks for base and range positions
    function _getTicksFromUniStrategy(address _pool)
        private
        returns (
            int24 baseTickLower,
            int24 baseTickUpper,
            int24 bidTickLower,
            int24 bidTickUpper,
            int24 rangeTickLower,
            int24 rangeTickUpper
        )
    {
        (, address strategy, , ) = getProtocolDetails();
        return IUnipilotStrategy(strategy).getTicks(_pool);
    }

    /// @dev Amount of token0 held as unused balance.
    function _balance0() private view returns (uint256) {
        return token0.balanceOf(address(this));
    }

    /// @dev Amount of token1 held as unused balance.
    function _balance1() private view returns (uint256) {
        return token1.balanceOf(address(this));
    }

    /// @inheritdoc IUnipilotVault
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external override {
        _verifyCallback();
        address recipient = msg.sender;
        address payer = abi.decode(data, (address));
        if (amount0Owed > 0)
            pay(address(token0), payer, recipient, amount0Owed);
        if (amount1Owed > 0)
            pay(address(token1), payer, recipient, amount1Owed);
    }

    /// @inheritdoc IUnipilotVault
    function uniswapV3SwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external override {
        _verifyCallback();

        require(amount0 > 0 || amount1 > 0);
        bool zeroForOne = abi.decode(data, (bool));

        if (zeroForOne)
            pay(address(token0), address(this), msg.sender, uint256(amount0));
        else pay(address(token1), address(this), msg.sender, uint256(amount1));
    }

    /// @notice Verify that caller should be the address of a valid Uniswap V3 Pool
    function _verifyCallback() private view {
        require(msg.sender == address(pool));
    }

    function getProtocolDetails()
        private
        view
        returns (
            address governance,
            address strategy,
            address indexFund,
            uint8 indexFundPercentage
        )
    {
        return unipilotFactory.getUnipilotDetails();
    }

    function transferFeesToIF(
        bool isReadjustLiquidity,
        uint256 fees0,
        uint256 fees1
    ) private {
        (, , address indexFund, uint8 percentage) = getProtocolDetails();

        if (fees0 > 0)
            token0.transfer(indexFund, FullMath.mulDiv(fees0, percentage, 100));
        if (fees1 > 0)
            token1.transfer(indexFund, FullMath.mulDiv(fees1, percentage, 100));

        emit FeesSnapshot(
            isReadjustLiquidity,
            fees0,
            fees1,
            _balance0(),
            _balance1(),
            totalSupply()
        );
    }

    function transferFunds(
        bool refundAsETH,
        address recipient,
        address token,
        uint256 amount
    ) private {
        if (refundAsETH && token == WETH) {
            unwrapWETH9(amount, recipient);
        } else {
            TransferHelper.safeTransfer(token, recipient, amount);
        }
    }

    function getBaseThreshold() private view returns (int24 baseThreshold) {
        (, address strategy, , ) = getProtocolDetails();
        return
            IUnipilotStrategy(strategy).getBaseThreshold(
                address(pool),
                tickSpacing
            );
    }

    /// @param token The token to pay
    /// @param payer The entity that must pay
    /// @param recipient The entity that will receive payment
    /// @param value The amount to pay
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

    /// @notice Unwraps the contract's WETH9 balance and sends it to recipient as ETH.
    /// @param balanceWETH9 The amount of WETH9 to unwrap
    /// @param recipient The address receiving ETH
    function unwrapWETH9(uint256 balanceWETH9, address recipient) internal {
        IWETH9(WETH).withdraw(balanceWETH9);
        TransferHelper.safeTransferETH(recipient, balanceWETH9);
    }

    receive() external payable {}

    fallback() external payable {}
}
