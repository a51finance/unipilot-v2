//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./libraries/TransferHelper.sol";
import "./interfaces/external/IWETH9.sol";
import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotFactory.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/SafeCastExtended.sol";
import "./libraries/UniswapPoolActions.sol";

import "@openzeppelin/contracts/drafts/ERC20Permit.sol";

/// @title Unipilot Active Vault
/// @author 0xMudassir & 721Orbit
/// @dev Active liquidity managment contract that handles user liquidity of any Uniswap V3 pool & earn fees for them
/// @dev minimalist, and gas-optimized contract that ensures user liquidity is always
/// in range and earns maximum amount of fees available at current liquidity utilization
/// rate.
/// @dev In order to minimize IL for users contract pulls liquidity to the vault (HODL) when necessary
contract UnipilotActiveVault is ERC20Permit, IUnipilotVault {
    using SafeCastExtended for uint256;
    using LowGasSafeMath for uint256;
    using UniswapPoolActions for IAlgebraPool;
    using UniswapLiquidityManagement for IAlgebraPool;

    IERC20 private token0;
    IERC20 private token1;
    int24 private tickSpacing;

    TicksData public ticksData;
    IAlgebraPool private pool;
    IUnipilotFactory private unipilotFactory;
    uint256 internal constant MIN_INITIAL_SHARES = 1e3;

    address private WETH;
    uint16 private _strategyType;
    uint32 private _pulled = 1;
    uint32 private _unlocked = 1;

    mapping(address => bool) private _operatorApproved;

    modifier onlyGovernance() {
        (address governance, , , , ) = getProtocolDetails();
        require(msg.sender == governance);
        _;
    }

    modifier onlyOperator() {
        require(_operatorApproved[msg.sender]);
        _;
    }

    modifier nonReentrant() {
        require(_unlocked == 1);
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    modifier checkDeviation() {
        (, address strategy, , , ) = getProtocolDetails();
        IUnipilotStrategy(strategy).checkDeviation(address(pool));
        _;
    }

    constructor(
        address _pool,
        address _unipilotFactory,
        address _WETH,
        uint16 _strategytype,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        require(_pool != address(0));
        require(_WETH != address(0));
        require(_unipilotFactory != address(0));

        pool = IAlgebraPool(_pool);
        unipilotFactory = IUnipilotFactory(_unipilotFactory);
        WETH = _WETH;
        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        tickSpacing = pool.tickSpacing();
        _strategyType = _strategytype;
    }

    receive() external payable {}

    fallback() external payable {}

    /// @inheritdoc IUnipilotVault
    function deposit(
        uint256 amount0Desired,
        uint256 amount1Desired,
        address recipient
    )
        external
        payable
        override
        nonReentrant
        checkDeviation
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(recipient != address(0));
        require(amount0Desired > 0 && amount1Desired > 0);

        address sender = _msgSender();
        uint256 totalSupply = totalSupply();

        (lpShares, amount0, amount1) = pool.computeLpShares(
            true,
            amount0Desired,
            amount1Desired,
            _balance0(),
            _balance1(),
            totalSupply,
            ticksData
        );

        if (totalSupply == 0) {
            // prevent first LP from stealing funds of subsequent LPs
            // see https://code4rena.com/reports/2022-01-sherlock/#h-01-first-user-can-steal-everyone-elses-tokens
            require(lpShares > MIN_INITIAL_SHARES, "ML");
        }

        require(lpShares != 0, "IS");

        pay(address(token0), sender, address(this), amount0);
        pay(address(token1), sender, address(this), amount1);

        if (_pulled == 1) {
            pool.mintLiquidity(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                amount0,
                amount1
            );
        }

        if (address(this).balance > 0)
            TransferHelper.safeTransferETH(sender, address(this).balance);

        _mint(recipient, lpShares);
        emit Deposit(sender, recipient, amount0, amount1, lpShares);
    }

    /// @inheritdoc IUnipilotVault
    function withdraw(
        uint256 liquidity,
        address recipient,
        bool refundAsETH
    )
        external
        override
        nonReentrant
        checkDeviation
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0);
        uint256 totalSupply = totalSupply();

        /// @dev if liquidity has pulled in contract then calculate share accordingly
        if (_pulled == 1) {
            uint256 liquidityShare = FullMath.mulDiv(
                liquidity,
                1e18,
                totalSupply
            );

            (amount0, amount1) = pool.burnUserLiquidity(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                liquidityShare,
                address(this)
            );

            (uint256 fees0, uint256 fees1) = pool.collectPendingFees(
                address(this),
                ticksData.baseTickLower,
                ticksData.baseTickUpper
            );

            transferFeesToIF(false, fees0, fees1);
        }

        uint256 unusedAmount0 = FullMath.mulDiv(
            _balance0().sub(amount0),
            liquidity,
            totalSupply
        );

        uint256 unusedAmount1 = FullMath.mulDiv(
            _balance1().sub(amount1),
            liquidity,
            totalSupply
        );

        amount0 = amount0.add(unusedAmount0);
        amount1 = amount1.add(unusedAmount1);

        if (amount0 > 0) {
            transferFunds(refundAsETH, recipient, address(token0), amount0);
        }

        if (amount1 > 0) {
            transferFunds(refundAsETH, recipient, address(token1), amount1);
        }

        _burn(msg.sender, liquidity);
        emit Withdraw(recipient, liquidity, amount0, amount1);

        if (_pulled == 1) {
            (uint256 c0, uint256 c1) = pool.mintLiquidity(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                _balance0(),
                _balance1()
            );

            emit CompoundFees(c0, c1);
        }
    }

    /// @inheritdoc IUnipilotVault
    function readjustLiquidity(uint8 swapBP)
        external
        override
        onlyOperator
        checkDeviation
    {
        _pulled = 1;
        ReadjustVars memory a;

        (uint128 totalLiquidity, , ) = pool.getPositionLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper
        );

        (a.amount0Desired, a.amount1Desired, a.fees0, a.fees1) = pool
            .burnLiquidity(
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                address(this)
            );

        transferFeesToIF(true, a.fees0, a.fees1);

        int24 baseThreshold = tickSpacing * getBaseThreshold();
        (, a.currentTick, ) = pool.getSqrtRatioX96AndTick();

        (a.tickLower, a.tickUpper) = UniswapLiquidityManagement.getBaseTicks(
            a.currentTick,
            baseThreshold,
            tickSpacing
        );

        if (
            (totalLiquidity > 0) &&
            (a.amount0Desired == 0 || a.amount1Desired == 0)
        ) {
            bool zeroForOne = a.amount0Desired > 0 ? true : false;

            int256 amountSpecified = zeroForOne
                ? FullMath.mulDiv(a.amount0Desired, swapBP, 100).toInt256()
                : FullMath.mulDiv(a.amount1Desired, swapBP, 100).toInt256();

            pool.swapToken(address(this), zeroForOne, amountSpecified);
        } else {
            a.amount0Desired = _balance0();
            a.amount1Desired = _balance1();

            a.liquidity = pool.getLiquidityForAmounts(
                a.amount0Desired,
                a.amount1Desired,
                a.tickLower,
                a.tickUpper
            );

            (a.amount0, a.amount1) = pool.getAmountsForLiquidity(
                a.liquidity,
                a.tickLower,
                a.tickUpper
            );

            a.zeroForOne = UniswapLiquidityManagement.amountsDirection(
                a.amount0Desired,
                a.amount1Desired,
                a.amount0,
                a.amount1
            );

            a.amountSpecified = a.zeroForOne
                ? int256(
                    FullMath.mulDiv(
                        a.amount0Desired.sub(a.amount0),
                        swapBP,
                        100
                    )
                )
                : int256(
                    FullMath.mulDiv(
                        a.amount1Desired.sub(a.amount1),
                        swapBP,
                        100
                    )
                );

            pool.swapToken(address(this), a.zeroForOne, a.amountSpecified);
        }

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        (ticksData.baseTickLower, ticksData.baseTickUpper) = pool
            .getPositionTicks(
                a.amount0Desired,
                a.amount1Desired,
                baseThreshold,
                tickSpacing
            );

        pool.mintLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            a.amount0Desired,
            a.amount1Desired
        );
    }

    function rebalance(
        int256 swapAmount,
        bool zeroForOne,
        int24 tickLower,
        int24 tickUpper
    ) external onlyOperator checkDeviation {
        _pulled = 1;
        UniswapLiquidityManagement.checkRange(
            tickLower,
            tickUpper,
            tickSpacing
        );

        // Withdraw all current liquidity from Uniswap pool & transfer fees
        (, , uint256 fees0, uint256 fees1) = pool.burnLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            address(this)
        );

        transferFeesToIF(true, fees0, fees1);

        if (swapAmount != 0)
            pool.swapToken(address(this), zeroForOne, swapAmount);

        pool.mintLiquidity(tickLower, tickUpper, _balance0(), _balance1());

        (ticksData.baseTickLower, ticksData.baseTickUpper) = (
            tickLower,
            tickUpper
        );
    }

    /// @inheritdoc IUnipilotVault
    function algebraMintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external override {
        _verifyCallback();
        address recipient = _msgSender();
        address payer = abi.decode(data, (address));

        if (amount0Owed > 0)
            TransferHelper.safeTransfer(
                address(token0),
                recipient,
                amount0Owed
            );

        if (amount1Owed > 0)
            TransferHelper.safeTransfer(
                address(token1),
                recipient,
                amount1Owed
            );
    }

    /// @inheritdoc IUnipilotVault
    function algebraSwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external override {
        _verifyCallback();

        require(amount0 > 0 || amount1 > 0);
        bool zeroForOne = abi.decode(data, (bool));

        if (zeroForOne)
            TransferHelper.safeTransfer(
                address(token0),
                _msgSender(),
                uint256(amount0)
            );
        else
            TransferHelper.safeTransfer(
                address(token1),
                _msgSender(),
                uint256(amount1)
            );
    }

    /// @notice Calculates the vault's total holdings of TOKEN0 and TOKEN1 - in
    /// other words, how much of each token the vault would hold if it withdrew
    /// all its liquidity from Uniswap.
    /// @dev Updates the position and return the updated reserves, fees & liquidity.
    /// @return amount0 Amount of token0 in the unipilot vault
    /// @return amount1 Amount of token1 in the unipilot vault
    /// @return fees0 Total amount of fees collected by unipilot position in terms of token0
    /// @return fees1 Total amount of fees collected by unipilot position in terms of token1
    /// @return baseLiquidity The total liquidity of the base position
    /// @return rangeLiquidity The total liquidity of the range position - N/A for active vault
    function getPositionDetails()
        external
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 fees0,
            uint256 fees1,
            uint128 baseLiquidity,
            uint128 rangeLiquidity
        )
    {
        return pool.getTotalAmounts(true, ticksData);
    }

    /// @notice Updates the status of given account as operator
    /// @dev Must be called by the current governance
    /// @param _operator Account to update status
    function toggleOperator(address _operator) external onlyGovernance {
        _operatorApproved[_operator] = !_operatorApproved[_operator];
    }

    /// @notice Returns the status for a given operator that can operate readjust & pull liquidity
    function isOperator(address _operator) external view returns (bool) {
        return _operatorApproved[_operator];
    }

    /// @notice Returns unipilot vault details
    /// @return The first of the two tokens of the pool, sorted by address
    /// @return The second of the two tokens of the pool, sorted by address
    /// @return The pool's fee in hundredths of a bip, i.e. 1e-6
    /// @return The address of the Uniswap V3 Pool
    function getVaultInfo()
        external
        view
        returns (
            address,
            address,
            uint16,
            address
        )
    {
        (, , uint16 fee, , , , ) = pool.globalState();
        return (address(token0), address(token1), fee, address(pool));
    }

    /// @dev Amount of token0 held as unused balance.
    function _balance0() internal view returns (uint256) {
        return token0.balanceOf(address(this));
    }

    /// @dev Amount of token1 held as unused balance.
    function _balance1() internal view returns (uint256) {
        return token1.balanceOf(address(this));
    }

    /// @notice Verify that caller should be the address of a valid Uniswap V3 Pool
    function _verifyCallback() internal view {
        require(msg.sender == address(pool));
    }

    function getBaseThreshold() internal view returns (int24 baseThreshold) {
        (, address strategy, , , ) = getProtocolDetails();
        return
            IUnipilotStrategy(strategy).getBaseThreshold(
                address(pool),
                _strategyType
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

    /// @dev method to transfer unipilot earned fees to Index Fund
    function transferFeesToIF(
        bool isReadjustLiquidity,
        uint256 fees0,
        uint256 fees1
    ) internal {
        (, , address indexFund, uint8 percentage, ) = getProtocolDetails();

        if (percentage > 0) {
            if (fees0 > 0)
                TransferHelper.safeTransfer(
                    address(token0),
                    indexFund,
                    FullMath.mulDiv(fees0, percentage, 100)
                );

            if (fees1 > 0)
                TransferHelper.safeTransfer(
                    address(token1),
                    indexFund,
                    FullMath.mulDiv(fees1, percentage, 100)
                );

            emit FeesSnapshot(isReadjustLiquidity, fees0, fees1);
        }
    }

    function transferFunds(
        bool refundAsETH,
        address recipient,
        address token,
        uint256 amount
    ) internal {
        if (refundAsETH && token == WETH) {
            IWETH9(WETH).withdraw(amount);
            TransferHelper.safeTransferETH(recipient, amount);
        } else {
            TransferHelper.safeTransfer(token, recipient, amount);
        }
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
}
