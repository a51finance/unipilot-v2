//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "./base/PeripheryPayments.sol";

import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotFactory.sol";
import "./interfaces/IUnipilotRouter.sol";
import "./libraries/UniswapLiquidityManagement.sol";
import "./libraries/UniswapPoolActions.sol";

import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@openzeppelin/contracts/drafts/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

import "hardhat/console.sol";

contract UnipilotVault is
    ERC20Permit,
    ERC20Burnable,
    IUnipilotVault,
    PeripheryPayments
{
    using SafeCast for uint256;
    using LowGasSafeMath for uint256;
    using UniswapPoolActions for IUniswapV3Pool;
    using UniswapLiquidityManagement for IUniswapV3Pool;

    IERC20 private token0;
    IERC20 private token1;
    // FeesData private feesData;
    TicksData private ticksData;
    IUniswapV3Pool private pool;
    IUnipilotFactory private unipilotFactory;

    address private governance;
    address private strategy;
    address private indexFund;
    address private router;

    uint24 private fee;
    int24 private tickSpacing;
    uint8 private _unlocked = 1;

    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    modifier nonReentrant() {
        require(_unlocked == 1);
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    constructor(
        address _pool,
        address _router,
        address _strategy,
        address _governance,
        address _unipilotFactory,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        router = _router;
        strategy = _strategy;
        governance = _governance;
        unipilotFactory = IUnipilotFactory(_unipilotFactory);
        pool = IUniswapV3Pool(_pool);
        token0 = IERC20(pool.token0());
        token1 = IERC20(pool.token1());
        fee = pool.fee();
        tickSpacing = pool.tickSpacing();
    }

    function deposit(
        address _depositor,
        address _recipient,
        uint256 _amount0Desired,
        uint256 _amount1Desired
    ) external payable override returns (uint256 lpShares) {
        // if (_isPoolWhitelisted()) {
        (lpShares, , ) = depositForActive(
            _depositor,
            _recipient,
            _amount0Desired,
            _amount1Desired
        );
        // } else {
        //     (lpShares, , ) = depositForPassive(
        //         _depositor,
        //         _recipient,
        //         _amount0Desired,
        //         _amount1Desired
        //     );
        // }
    }

    function depositForActive(
        address _depositor,
        address _recipient,
        uint256 _amount0Desired,
        uint256 _amount1Desired
    )
        internal
        returns (
            uint256 lpShares,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(_depositor != address(0) && _recipient != address(0), "IAD");
        pool.updatePosition(ticksData.baseTickLower, ticksData.baseTickUpper);

        (lpShares, amount0, amount1) = UniswapLiquidityManagement
            .computeLpShares(
                _amount0Desired,
                _amount1Desired,
                totalSupply(),
                ticksData.baseTickLower,
                ticksData.baseTickUpper,
                _balance0(),
                _balance1(),
                pool
            );
        require(lpShares != 0, "ISH");

        // if (msg.sender != router) {
        //     pay(address(token0), _depositor, address(this), amount0);
        //     pay(address(token1), _depositor, address(this), amount1);
        // }

        uint128 liquidity = pool.getLiquidityForAmounts(
            amount0,
            amount1,
            ticksData.baseTickLower,
            ticksData.baseTickUpper
        );

        pool.mintLiquidity(
            msg.sender,
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            liquidity
        );
        // else {
        //     IUnipilotRouter(router).vaultPayCallback(
        //         _depositor,
        //         address(token0),
        //         address(token1),
        //         amount0,
        //         amount1,
        //         fee
        //     );
        // }

        _mint(_recipient, lpShares);
        emit Deposit(_depositor, amount0, amount1, lpShares);
    }

    // function depositForPassive(
    //     address _depositor,
    //     address _recipient,
    //     uint256 _amount0Desired,
    //     uint256 _amount1Desired
    // )
    //     internal
    //     returns (
    //         uint256 lpShares,
    //         uint256 amount0,
    //         uint256 amount1
    //     )
    // {
    //     uint256 totalSupply = totalSupply();
    //     if (totalSupply == 0) {
    //         (
    //             ticksData.baseTickLower,
    //             ticksData.baseTickUpper,
    //             ,
    //             ,
    //             ticksData.rangeTickLower,
    //             ticksData.rangeTickUpper
    //         ) = _getTicksFromUniStrategy(address(pool));
    //     }

    //     (lpShares, amount0, amount1) = UniswapLiquidityManagement
    //         .computeLpShares(
    //             _amount0Desired,
    //             _amount1Desired,
    //             totalSupply,
    //             ticksData.baseTickLower,
    //             ticksData.baseTickUpper,
    //             _balance0(),
    //             _balance1(),
    //             pool
    //         );

    //     uint128 liquidity = pool.getLiquidityForAmounts(
    //         amount0,
    //         amount1,
    //         ticksData.baseTickLower,
    //         ticksData.baseTickUpper
    //     );

    //     if (msg.sender != router) {
    //         pay(address(token0), _depositor, address(this), amount0);
    //         pay(address(token1), _depositor, address(this), amount1);
    //     } else {
    //         IUnipilotRouter(router).vaultPayCallback(
    //             _depositor,
    //             address(token0),
    //             address(token1),
    //             amount0,
    //             amount1,
    //             fee
    //         );
    //     }
    //     (uint256 baseAmount0, uint256 baseAmount1) = pool.mintLiquidity(
    //         address(this),
    //         ticksData.baseTickLower,
    //         ticksData.baseTickUpper,
    //         liquidity
    //     );

    //     uint256 remainingAmount0 = _amount0Desired.sub(baseAmount0);
    //     uint256 remainingAmount1 = _amount1Desired.sub(baseAmount1);

    //     liquidity = pool.getLiquidityForAmounts(
    //         remainingAmount0,
    //         remainingAmount1,
    //         ticksData.rangeTickLower,
    //         ticksData.rangeTickUpper
    //     );

    //     pool.mintLiquidity(
    //         address(this),
    //         ticksData.rangeTickLower,
    //         ticksData.rangeTickUpper,
    //         liquidity
    //     );

    //     _mint(_recipient, lpShares);
    //     emit Deposit(_depositor, amount0, amount1, lpShares);
    // }

    function init() external onlyGovernance {
        IUnipilotStrategy(strategy).getTicks(address(pool));
        int24 baseThreshold = tickSpacing *
            IUnipilotStrategy(strategy).getBaseThreshold(address(pool));
        (, int24 currentTick) = getSqrtRatioX96AndTick();

        int24 tickFloor = UniswapLiquidityManagement.floor(
            currentTick,
            tickSpacing
        );

        ticksData.baseTickLower = tickFloor - baseThreshold;
        ticksData.baseTickUpper = tickFloor + baseThreshold;

        UniswapLiquidityManagement.checkRange(
            ticksData.baseTickLower,
            ticksData.baseTickUpper
        );
    }

    function readjustLiquidity() external override {
        // if (_isPoolWhitelisted()) {
        readjustLiquidityForActive();
        // } else {
        // readjustLiquidityForPassive();
        // }
    }

    function readjustLiquidityForActive() private {
        ReadjustVars memory a;
        (a.sqrtPriceX96, a.currentTick) = getSqrtRatioX96AndTick();

        (a.fees0, a.fees1) = pool.burnLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            address(this)
        );
        console.log("fees 0", a.fees0);
        console.log("fees 1", a.fees1);

        if (a.fees0 > 0)
            token0.transfer(indexFund, FullMath.mulDiv(a.fees0, 10, 100));
        if (a.fees1 > 0)
            token1.transfer(indexFund, FullMath.mulDiv(a.fees1, 10, 100));

        emit FeesSnapshot(
            a.fees0,
            a.fees1,
            _balance0(),
            _balance1(),
            totalSupply()
        );

        int24 baseThreshold = IUnipilotStrategy(strategy).getBaseThreshold(
            address(pool)
        );

        console.log("basethreshold", uint256(baseThreshold));

        (a.tickLower, a.tickUpper) = UniswapLiquidityManagement.getBaseTicks(
            a.currentTick,
            baseThreshold,
            tickSpacing
        );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        a.liquidity = pool.getLiquidityForAmounts(
            a.amount0Desired,
            a.amount1Desired,
            a.tickLower,
            a.tickUpper
        );

        console.log("liquidity", a.liquidity);

        (a.amount0, a.amount1) = pool.getAmountsForLiquidity(
            a.liquidity,
            a.tickLower,
            a.tickUpper
        );

        console.log("amount 0 ", a.amount0);
        console.log("amount 1", a.amount1);
        a.zeroForOne = UniswapLiquidityManagement.amountsDirection(
            a.amount0Desired,
            a.amount1Desired,
            a.amount0,
            a.amount1
        );

        a.amountSpecified = a.zeroForOne
            ? int256(FullMath.mulDiv(a.amount0Desired.sub(a.amount0), 50, 100))
            : int256(FullMath.mulDiv(a.amount1Desired.sub(a.amount1), 50, 100));

        console.log("amount specified", a.amountSpecified);
        a.exactSqrtPriceImpact = (a.sqrtPriceX96 * (1e5 / 2)) / 1e6;

        a.sqrtPriceLimitX96 = a.zeroForOne
            ? a.sqrtPriceX96 - a.exactSqrtPriceImpact
            : a.sqrtPriceX96 + a.exactSqrtPriceImpact;

        pool.swap(
            address(this),
            a.zeroForOne,
            a.amountSpecified,
            a.sqrtPriceLimitX96,
            abi.encode(a.zeroForOne)
        );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        (ticksData.baseTickLower, ticksData.baseTickUpper) = pool
            .getPositionTicks(
                a.amount0Desired,
                a.amount1Desired,
                baseThreshold,
                tickSpacing
            );

        a.liquidity = pool.getLiquidityForAmounts(
            a.amount0Desired,
            a.amount1Desired,
            ticksData.baseTickLower,
            ticksData.baseTickUpper
        );

        pool.mintLiquidity(
            address(this),
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            a.liquidity
        );
    }

    // temperory function to check position fees and reserves
    function getPositionDetails()
        external
        view
        returns (
            uint256 amount0,
            uint256 amount1,
            uint256 fees0,
            uint256 fees1
        )
    {
        (int24 tl, int24 tu) = (
            ticksData.baseTickLower,
            ticksData.baseTickUpper
        );
        (uint128 liquidity, uint256 unclaimed0, uint256 unclaimed1) = pool
            .getPositionLiquidity(tl, tu);

        (amount0, amount1) = pool.getAmountsForLiquidity(liquidity, tl, tu);

        fees0 = unclaimed0;
        fees1 = unclaimed1;
    }

    function updatePosition() external {
        pool.updatePosition(ticksData.baseTickLower, ticksData.baseTickUpper);
    }

    // function readjustLiquidityForPassive() private {
    //     (uint160 sqrtPriceX96, ) = getSqrtRatioX96AndTick();

    //     (uint256 baseFees0, uint256 baseFees1) = pool.burnLiquidity(
    //         ticksData.baseTickLower,
    //         ticksData.baseTickUpper,
    //         address(this)
    //     );

    //     (uint256 rangeFees0, uint256 rangeFees1) = pool.burnLiquidity(
    //         ticksData.rangeTickLower,
    //         ticksData.rangeTickUpper,
    //         address(this)
    //     );

    //     (uint256 fees0, uint256 fees1) = (
    //         baseFees0.add(rangeFees0),
    //         baseFees1.add(rangeFees1)
    //     );

    //     if (fees0 > 0)
    //         token0.transfer(indexFund, FullMath.mulDiv(fees0, 10, 100));
    //     if (fees1 > 0)
    //         token1.transfer(indexFund, FullMath.mulDiv(fees1, 10, 100));

    //     uint256 amount0 = _balance0();
    //     uint256 amount1 = _balance1();

    //     emit FeesSnapshot(fees0, fees1, amount0, amount1, totalSupply());

    //     if (amount0 == 0 || amount1 == 0) {
    //         bool zeroForOne = amount0 > 0 ? true : false;

    //         int256 amountSpecified = zeroForOne
    //             ? int256(FullMath.mulDiv(amount0, 10, 100))
    //             : int256(FullMath.mulDiv(amount1, 10, 100));

    //         uint160 exactSqrtPriceImpact = (sqrtPriceX96 * (1e5 / 2)) / 1e6;

    //         uint160 sqrtPriceLimitX96 = zeroForOne
    //             ? sqrtPriceX96 - exactSqrtPriceImpact
    //             : sqrtPriceX96 + exactSqrtPriceImpact;

    //         pool.swap(
    //             address(this),
    //             zeroForOne,
    //             amountSpecified,
    //             sqrtPriceLimitX96,
    //             abi.encode(zeroForOne)
    //         );
    //     }

    //     Tick memory ticks;
    //     (
    //         ticks.baseTickLower,
    //         ticks.baseTickUpper,
    //         ticks.bidTickLower,
    //         ticks.bidTickUpper,
    //         ticks.rangeTickLower,
    //         ticks.rangeTickUpper
    //     ) = _getTicksFromUniStrategy(address(pool));

    //     uint128 baseLiquidity = pool.getLiquidityForAmounts(
    //         amount0,
    //         amount1,
    //         ticks.baseTickLower,
    //         ticks.baseTickUpper
    //     );

    //     pool.mintLiquidity(
    //         address(this),
    //         ticks.baseTickLower,
    //         ticks.baseTickUpper,
    //         baseLiquidity
    //     );

    //     ticksData.baseTickLower = ticks.baseTickLower;
    //     ticksData.baseTickUpper = ticks.baseTickUpper;

    //     amount0 = _balance0();
    //     amount1 = _balance1();

    //     uint128 rangeLiquidity;
    //     if (amount0 > 0 || amount1 > 0) {
    //         uint128 range0 = pool.getLiquidityForAmounts(
    //             amount0,
    //             amount1,
    //             ticks.bidTickLower,
    //             ticks.bidTickUpper
    //         );

    //         uint128 range1 = pool.getLiquidityForAmounts(
    //             amount0,
    //             amount1,
    //             ticks.rangeTickLower,
    //             ticks.rangeTickUpper
    //         );

    //         /// only one range position will ever have liquidity (if any)
    //         if (range1 < range0) {
    //             rangeLiquidity = range0;
    //             ticksData.rangeTickLower = ticks.bidTickLower;
    //             ticksData.rangeTickUpper = ticks.bidTickUpper;
    //         } else if (0 < range1) {
    //             ticksData.rangeTickLower = ticks.rangeTickLower;
    //             ticksData.rangeTickUpper = ticks.rangeTickUpper;
    //             rangeLiquidity = range1;
    //         }
    //     }

    //     if (rangeLiquidity > 0) {
    //         pool.mintLiquidity(
    //             address(this),
    //             ticksData.rangeTickLower,
    //             ticksData.rangeTickUpper,
    //             rangeLiquidity
    //         );
    //     }
    // }

    function withdraw(uint256 liquidity, address recipient)
        external
        override
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0, "IL");

        (amount0, amount1) = pool.burnUserLiquidity(
            ticksData.baseTickLower,
            ticksData.baseTickUpper,
            liquidityShare(liquidity),
            recipient
        );

        // if (!_isPoolWhitelisted()) {
        //     (uint256 range0, uint256 range1) = pool.burnUserLiquidity(
        //         ticksData.baseTickLower,
        //         ticksData.baseTickUpper,
        //         liquidityShare(liquidity),
        //         recipient
        //     );
        //     amount0 = amount0.add(range0);
        //     amount1 = amount1.add(range1);
        // }

        uint256 totalSupply = totalSupply();

        uint256 unusedAmount0 = FullMath.mulDiv(
            _balance0(),
            liquidity,
            totalSupply
        );

        uint256 unusedAmount1 = FullMath.mulDiv(
            _balance1(),
            liquidity,
            totalSupply
        );

        if (unusedAmount0 > 0) token0.transfer(recipient, unusedAmount0);
        if (unusedAmount1 > 0) token1.transfer(recipient, unusedAmount1);

        amount0 = amount0.add(unusedAmount0);
        amount1 = amount1.add(unusedAmount1);

        _burn(msg.sender, liquidity);
        emit Withdraw(msg.sender, recipient, liquidity, amount0, amount1);
    }

    function getVaultInfo()
        external
        view
        override
        returns (
            address,
            address,
            address,
            uint256
        )
    {
        return (address(token0), address(token1), indexFund, fee);
    }

    /// @dev fetches the new ticks for base and range positions
    function _getTicksFromUniStrategy(address pool)
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
        return IUnipilotStrategy(strategy).getTicks(pool);
    }

    function _isPoolWhitelisted() internal view returns (bool isWhitelisted) {
        (, isWhitelisted) = IUnipilotFactory(unipilotFactory).getVaults(
            address(token0),
            address(token1),
            fee
        );
    }

    /// @dev Amount of token0 held as unused balance.
    function _balance0() private view returns (uint256) {
        return token0.balanceOf(address(this));
    }

    /// @dev Amount of token1 held as unused balance.
    function _balance1() private view returns (uint256) {
        return token1.balanceOf(address(this));
    }

    function getSqrtRatioX96AndTick()
        private
        view
        returns (uint160 _sqrtRatioX96, int24 _tick)
    {
        (_sqrtRatioX96, _tick, , , , , ) = pool.slot0();
    }

    function liquidityShare(uint256 liquidity)
        internal
        view
        returns (uint256 liquiditySharePercentage)
    {
        return FullMath.mulDiv(liquidity, 1e18, totalSupply());
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

        require(amount0 > 0 || amount1 > 0, "SBL");
        bool zeroForOne = abi.decode(data, (bool));

        if (zeroForOne)
            pay(address(token0), address(this), msg.sender, uint256(amount0));
        else pay(address(token1), address(this), msg.sender, uint256(amount1));
    }

    /// @notice Verify that caller should be the address of a valid Uniswap V3 Pool
    function _verifyCallback() private view {
        require(msg.sender == address(pool));
    }

    // @return tick Uniswap pool's current price tick
    function currentTick() private view returns (int24 tick) {
        (, tick, , , , , ) = pool.slot0();
    }
}
