//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./base/PeripheryPayments.sol";

import "./interfaces/IUnipilotVault.sol";
import "./interfaces/IUnipilotStrategy.sol";
import "./interfaces/IUnipilotFactory.sol";

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
    IUniswapV3Pool private pool;
    IUnipilotFactory private factory;
    address private strategy;
    address public governance;
    address private indexFund;
    address private router;
    int24 private tickSpacing;
    int24 private baseTickLower;
    int24 private baseTickUpper;
    int24 private rangeTickLower;
    int24 private rangeTickUpper;
    uint8 private _unlocked = 1;
    uint24 private fee;

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
        address _governance,
        address _factory,
        address _router,
        address _pool,
        address _strategy,
        string memory _name,
        string memory _symbol
    ) ERC20Permit(_name) ERC20(_name, _symbol) {
        governance = _governance;
        router = _router;
        factory = IUnipilotFactory(_factory);
        strategy = _strategy;
        initializeVault(_pool);
    }

    function initializeVault(address _pool) internal {
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
        (, bool isWhitelisted) = factory.getVaults(
            address(token0),
            address(token1),
            fee
        );
        if (isWhitelisted) {
            lpShares = depositForActive(
                _depositor,
                _recipient,
                _amount0Desired,
                _amount1Desired
            );
        } else {
            lpShares = depositForPassive(
                _depositor,
                _recipient,
                _amount0Desired,
                _amount1Desired
            );
        }
    }

    function depositForActive(
        address _depositor,
        address _recipient,
        uint256 _amount0Desired,
        uint256 _amount1Desired
    ) internal returns (uint256 lpShares) {
        require(_depositor != address(0) && _recipient != address(0), "IAD");
        (lpShares, , ) = UniswapLiquidityManagement.computeLpShares(
            _amount0Desired,
            _amount1Desired,
            totalSupply(),
            baseTickLower,
            baseTickUpper,
            _balance0(),
            _balance1(),
            pool
        );
        require(lpShares != 0, "ISH");

        if (msg.sender != router) {
            pay(address(token0), _depositor, address(this), _amount0Desired);
            pay(address(token1), _depositor, address(this), _amount1Desired);
        }

        _mint(_recipient, lpShares);
        console.log("TOTAL SUPPLY", totalSupply());
        emit Deposit(_depositor, _amount0Desired, _amount1Desired, lpShares);
    }

    function depositForPassive(
        address _depositor,
        address _recipient,
        uint256 _amount0Desired,
        uint256 _amount1Desired
    ) internal returns (uint256 lpShares) {
        uint256 totalSupply = totalSupply();
        if (totalSupply == 0) {
            (
                baseTickLower,
                baseTickUpper,
                ,
                ,
                rangeTickLower,
                rangeTickUpper
            ) = _getTicksFromUniStrategy(address(pool));
        }
        (lpShares, , ) = UniswapLiquidityManagement.computeLpShares(
            _amount0Desired,
            _amount1Desired,
            totalSupply,
            baseTickLower,
            baseTickUpper,
            _balance0(),
            _balance1(),
            pool
        );
        (
            uint128 baseLiquidity,
            uint256 baseAmount0,
            uint256 baseAmount1
        ) = _addLiquidityUniswap(
                AddLiquidityParams({
                    token0: address(token0),
                    token1: address(token1),
                    fee: fee,
                    tickLower: baseTickLower,
                    tickUpper: baseTickUpper,
                    amount0Desired: _amount0Desired,
                    amount1Desired: _amount1Desired
                })
            );

        uint256 remainingAmount0 = _amount0Desired.sub(baseAmount0);
        uint256 remainingAmount1 = _amount1Desired.sub(baseAmount1);

        (uint128 rangeLiquidity, , ) = _addLiquidityUniswap(
            AddLiquidityParams({
                token0: address(token0),
                token1: address(token1),
                fee: fee,
                tickLower: rangeTickLower,
                tickUpper: rangeTickUpper,
                amount0Desired: remainingAmount0,
                amount1Desired: remainingAmount1
            })
        );

        if (msg.sender != router) {
            pay(address(token0), _depositor, address(this), _amount0Desired);
            pay(address(token1), _depositor, address(this), _amount1Desired);
        }

        _mint(_recipient, lpShares);
        emit Deposit(_depositor, _amount0Desired, _amount1Desired, lpShares);
    }

    function _addLiquidityUniswap(AddLiquidityParams memory params)
        private
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        liquidity = UniswapLiquidityManagement.getLiquidityForAmounts(
            pool,
            params.amount0Desired,
            params.amount1Desired,
            params.tickLower,
            params.tickUpper
        );

        (amount0, amount1) = pool.mint(
            address(this),
            params.tickLower,
            params.tickUpper,
            liquidity,
            abi.encode(address(this))
        );
    }

    function readjustLiquidity() external {
        (, bool isWhitelisted) = factory.getVaults(
            address(token0),
            address(token1),
            fee
        );

        if (isWhitelisted) {
            readjustLiquidityForActive();
        }
        // else {
        //     readjustLiquidityForPassive();
        // }
    }

    function readjustLiquidityForActive() private {
        ReadjustVars memory a;
        (a.sqrtPriceX96, a.currentTick) = getSqrtRatioX96AndTick();

        (a.fees0, a.fees1) = pool.burnLiquidity(
            baseTickLower,
            baseTickUpper,
            address(this)
        );

        if (a.fees0 > 0)
            token0.transfer(indexFund, FullMath.mulDiv(a.fees0, 10, 100));
        if (a.fees1 > 0)
            token1.transfer(indexFund, FullMath.mulDiv(a.fees1, 10, 100));

        emit FeesSnapshot(
            a.currentTick,
            a.fees0,
            a.fees1,
            _balance0(),
            _balance1(),
            totalSupply()
        );

        console.log("calling from vault1", address(strategy));
        console.log("pool", address(pool));
        IUnipilotStrategy(strategy).getTicks(address(pool));
        int24 baseThreshold = IUnipilotStrategy(strategy).getBaseThreshold(
            address(pool)
        );
        console.log("calling from vault2");
        (a.tickLower, a.tickUpper) = UniswapLiquidityManagement.getBaseTicks(
            a.currentTick,
            baseThreshold,
            tickSpacing
        );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        console.log("amount 0 desired", a.amount0Desired);
        console.log("amount 1 desired", a.amount1Desired);
        console.log("tick lower", uint256(a.tickLower));
        console.log("tick upper", uint256(a.tickUpper));

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
            ? int256(FullMath.mulDiv(a.amount0Desired.sub(a.amount0), 50, 100))
            : int256(FullMath.mulDiv(a.amount1Desired.sub(a.amount1), 50, 100));

        a.exactSqrtPriceImpact = (a.sqrtPriceX96 * (1e5 / 2)) / 1e6;

        a.sqrtPriceLimitX96 = a.zeroForOne
            ? a.sqrtPriceX96 - a.exactSqrtPriceImpact
            : a.sqrtPriceX96 + a.exactSqrtPriceImpact;

        console.log("address", address(this));
        console.log("zero for one", a.zeroForOne);
        console.log("amountSpecified", uint256(a.amountSpecified));
        console.log("sqrtPriceLimitX96", uint256(a.sqrtPriceLimitX96));
        // pool.swap(
        //     address(this),
        //     a.zeroForOne,
        //     a.amountSpecified,
        //     a.sqrtPriceLimitX96,
        //     abi.encode(a.zeroForOne)
        // );

        a.amount0Desired = _balance0();
        a.amount1Desired = _balance1();

        (baseTickLower, baseTickUpper) = pool.getPositionTicks(
            a.amount0Desired,
            a.amount1Desired,
            baseThreshold,
            tickSpacing
        );

        a.liquidity = pool.getLiquidityForAmounts(
            a.amount0Desired,
            a.amount1Desired,
            baseTickLower,
            baseTickUpper
        );

        pool.mintLiquidity(
            address(this),
            baseTickLower,
            baseTickUpper,
            a.liquidity
        );
    }

    // function readjustLiquidityForPassive() private {
    //     (uint160 sqrtPriceX96, int24 currentTick) = getSqrtRatioX96AndTick();

    //     (uint256 baseFees0, uint256 baseFees1) = pool.burnLiquidity(
    //         baseTickLower,
    //         baseTickUpper,
    //         address(this)
    //     );

    //     (uint256 rangeFees0, uint256 rangeFees1) = pool.burnLiquidity(
    //         rangeTickLower,
    //         rangeTickUpper,
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

    //     emit FeesSnapshot(
    //         currentTick,
    //         fees0,
    //         fees1,
    //         amount0,
    //         amount1,
    //         totalSupply()
    //     );

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

    //     pool.mint(
    //         address(this),
    //         ticks.baseTickLower,
    //         ticks.baseTickUpper,
    //         baseLiquidity,
    //         abi.encode(address(this))
    //     );

    //     baseTickLower = ticks.baseTickLower;
    //     baseTickUpper = ticks.baseTickUpper;

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
    //             rangeTickLower = ticks.bidTickLower;
    //             rangeTickUpper = ticks.bidTickUpper;
    //         } else if (0 < range1) {
    //             rangeTickLower = ticks.rangeTickLower;
    //             rangeTickUpper = ticks.rangeTickUpper;
    //             rangeLiquidity = range1;
    //         }
    //     }

    //     if (rangeLiquidity > 0) {
    //         pool.mint(
    //             address(this),
    //             rangeTickLower,
    //             rangeTickUpper,
    //             rangeLiquidity,
    //             abi.encode(address(this))
    //         );
    //     }
    // }

    function withdraw(uint256 liquidity, address recipient)
        external
        returns (uint256 amount0, uint256 amount1)
    {
        require(liquidity > 0, "IL");

        (amount0, amount1) = pool.burnUserLiquidity(
            baseTickLower,
            baseTickUpper,
            liquidityShare(liquidity),
            recipient
        );

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
            uint256
        )
    {
        return (address(token0), address(token1), fee);
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

    function _addLiquidityUniswap(
        address payer,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal returns (uint256 amount0, uint256 amount1) {
        if (liquidity > 0) {
            (amount0, amount1) = pool.mint(
                address(this),
                tickLower,
                tickUpper,
                liquidity,
                abi.encode(payer)
            );
        }
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
        console.log("amount0", uint256(amount0));
        console.log("amount1", uint256(amount1));

        require(amount0 > 0 || amount1 > 0, "sould be less");
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
