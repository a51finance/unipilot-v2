pragma solidity =0.7.6;
pragma abicoder v2;

import "./interfaces/IUnipilotStrategy.sol";
import "./base/oracle/libraries/OracleLibrary.sol";

import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

//import "hardhat/console.sol";

/**
 *
 * @notice
 *   This contract calculates suitable tick ranges to fully deposit liquidity asset.
 *   It maintains two strategies for unipilot vaults
 *   1) Base order => For depositing in-range liquidity
 *   2) Range order => To distribute remaining assets behind or ahead of base order ticks,
 *   so that users liquidity does not abruptly goes out of range
 *   @dev These ranges are named as follows.
 *   Base => upper and lower ticks for main range to deposit
 *   Ask => Upper and lower ticks ahead of the current tick and base upper
 *   Bid => Upper and lower ticks behind the current and base lower
 **/
contract UnipilotStrategy is IUnipilotStrategy {
    /// @dev governance address is set on deployment for the governance based functions
    address public governance;
    /// @dev unipilot address;
    address public unipilot;
    /// @dev rangeTicks is multiplied with tick spacing to calculate range order spread
    int24 public rangeTicks;
    /// @dev baseTicks is multiplied with tick spacing to calculate base order spread
    int24 public baseTicks;
    /// @dev rangeOrder is the range calculate the spread behind and ahead of the base range
    int24 private rangeOrder;
    /// @dev maxTwapDeviation is the max time weighted average deviation of price from the normal range in both directions
    int24 private maxTwapDeviation;
    /// @dev readjustMultiplier is the percentage multiplier of raedjust threshold
    int24 private readjustMultiplier;
    /// @dev twapDuration is the minimum duration in which the diviated price moves
    uint32 private twapDuration;

    constructor(address _governance) {
        governance = _governance;
        maxTwapDeviation = 300;
        twapDuration = 3600;
        rangeTicks = 1800;
        baseTicks = 1800;
        readjustMultiplier = 10;
    }

    /// @dev poolStrategy maintains the base,range multipliers and
    ///  twap variations for each pool
    mapping(address => PoolStrategy) internal poolStrategy;

    modifier onlyGovernance() {
        require(msg.sender == governance, "NG");
        _;
    }

    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "IGA");
        emit GovernanceUpdated(governance, _governance);
        governance = _governance;
    }

    /**
     *   @notice This function returns base,ask and bid range ticks for the given pool
     *   - It fetches the current tick and tick spacing of the pool
     *   - Multiples the tick spacing with pools base and range multipliers
     *   - Calculates pools twap and verifies whether it is under the maxtwapdeviation
     *   - If the price is under the deviation limit, it returns the base ranges along with range order ticks
     *   @param _pool: pool address
     **/
    function getTicks(address _pool)
        external
        override
        returns (
            int24 baseLower,
            int24 baseUpper,
            int24 bidLower,
            int24 bidUpper,
            int24 askLower,
            int24 askUpper
        )
    {
        (int24 tick, int24 tickSpacing) = getCurrentTick(_pool);

        if (poolStrategy[_pool].baseThreshold == 0) {
            int24 baseFloor = _floor(baseTicks, tickSpacing);

            poolStrategy[_pool] = PoolStrategy({
                baseThreshold: baseFloor,
                rangeThreshold: _floor(rangeTicks, tickSpacing),
                maxTwapDeviation: maxTwapDeviation,
                readjustThreshold: (baseFloor * readjustMultiplier) / 100,
                twapDuration: twapDuration
            });
        }
        rangeOrder = poolStrategy[_pool].rangeThreshold;

        int24 maxThreshold = poolStrategy[_pool].baseThreshold > rangeOrder
            ? poolStrategy[_pool].baseThreshold
            : rangeOrder;

        require(
            (tick > TickMath.MIN_TICK + maxThreshold + tickSpacing) &&
                (tick < (TickMath.MAX_TICK - maxThreshold - tickSpacing)),
            "IT"
        );
        int24 twap = calculateTwap(_pool);
        int24 deviation = tick > twap ? tick - twap : twap - tick;

        require(deviation <= poolStrategy[_pool].maxTwapDeviation, "MTF");

        int24 tickFloor = _floor(tick, tickSpacing);
        int24 tickCeil = tickFloor + tickSpacing;

        baseLower = tickFloor - poolStrategy[_pool].baseThreshold;
        baseUpper = tickFloor + poolStrategy[_pool].baseThreshold;
        bidLower = tickFloor - rangeOrder;
        bidUpper = tickFloor;
        askLower = tickCeil;
        askUpper = tickCeil + rangeOrder;
    }

    /**
     *   @notice This function sets the global multipier value of the range order
     *   @param _rangeTicks: a multiplier value to decide the spread of range order
     **/
    function setRangeTicks(int24 _rangeTicks) external onlyGovernance {
        require(_rangeTicks > 0, "IRM");
        emit RangeTicksUpdated(rangeTicks, rangeTicks = _rangeTicks);
    }

    /**
     *   @notice This function updates the base range mutiplier
     *   @param _baseTicks: a mutiplier value to decide the spread of base range
     **/
    function setBaseTicks(int24 _baseTicks) external onlyGovernance {
        require(_baseTicks > 0, "IBM");
        emit BaseTicksUpdated(baseTicks, baseTicks = _baseTicks);
    }

    /**
     *   @notice This function updates the deviation limit of tick spread
     *   @param _twapDeviation: a value to decide the maximum price deviation
     **/
    function setMaxTwapDeviation(int24 _twapDeviation) external onlyGovernance {
        emit MaxTwapDeviationUpdated(
            maxTwapDeviation,
            maxTwapDeviation = _twapDeviation
        );
    }

    /**
     *   @notice This function updates the twap duration
     *   @param _twapDuration: a value for the duration of recalbiration of the twap
     **/
    function setTwapDuration(uint32 _twapDuration) external onlyGovernance {
        emit TwapDurationUpdated(twapDuration, twapDuration = _twapDuration);
    }

    function setReadjustMultiplier(int24 _readjustMultipier)
        external
        onlyGovernance
    {
        require(_readjustMultipier > 0, "IREM");
        emit ReadjustMultiplierUpdated(
            readjustMultiplier,
            readjustMultiplier = _readjustMultipier
        );
    }

    /**
     *   @notice This function updates the range,base threshold and twap values specific to a pool
     *   @param params: struct values of PoolStrategy struct, the values can be inspected from interface
     *   @param _pool<: pool address
     **/
    function changeStrategy(PoolStrategy memory params, address _pool)
        public
        onlyGovernance
    {
        PoolStrategy memory oldStrategy = poolStrategy[_pool];
        validateStrategy(
            params.baseThreshold,
            IUniswapV3Pool(_pool).tickSpacing()
        );
        emit StrategyUpdated(
            oldStrategy,
            poolStrategy[_pool] = PoolStrategy({
                baseThreshold: params.baseThreshold,
                rangeThreshold: params.rangeThreshold,
                maxTwapDeviation: params.maxTwapDeviation,
                readjustThreshold: params.readjustThreshold,
                twapDuration: params.twapDuration
            })
        );
    }

    function setAllStrategies(
        PoolStrategy[] memory params,
        address[] memory pools
    ) external {
        for (uint256 i = 0; i < params.length; i++) {
            changeStrategy(params[i], pools[i]);
        }
    }

    /**
     *   @notice This function updates the twapDeviation value of pools iteratively
     *   @param _pools: pools addresses
     *   @param _twapDeviations: devaiation values
     **/
    function setPoolTwapDeviation(
        address[] memory _pools,
        int24[] memory _twapDeviations
    ) external onlyGovernance {
        for (uint256 i; i < _pools.length; i++) {
            poolStrategy[_pools[i]].maxTwapDeviation = _twapDeviations[i];
        }
    }

    /**
     *   @notice This function updates the unipilot contract address
     *   @param _unipilot: unipilot contract address
     **/
    function updateUnipilotAddress(address _unipilot) external onlyGovernance {
        require(_unipilot != address(0), "ZA");
        unipilot = _unipilot;
    }

    function getStrategy(address _pool)
        external
        view
        override
        returns (PoolStrategy memory strategy)
    {
        strategy = poolStrategy[_pool];
    }

    /**
     *   @notice This function returns the readjust threshold of a pool
     *   @param _pool: pool address
     **/
    function getReadjustThreshold(address _pool)
        external
        view
        override
        returns (int24 readjustThreshold)
    {
        // console.log(
        //     "readjustThreshold",
        //     uint256(poolStrategy[_pool].readjustThreshold)
        // );
        readjustThreshold = poolStrategy[_pool].readjustThreshold;
        return readjustThreshold;
    }

    function getBaseThreshold(address _pool)
        external
        view
        override
        returns (int24 baseThreshold)
    {
        baseThreshold = poolStrategy[_pool].baseThreshold;
    }

    /**
     *   @notice This function calculates the current twap of pool
     *   @param pool: pool address
     **/
    function calculateTwap(address pool) internal view returns (int24 twap) {
        uint128 inRangeLiquidity = IUniswapV3Pool(pool).liquidity();
        if (inRangeLiquidity == 0) {
            (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
            twap = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
        } else {
            twap = getTwap(pool);
        }
    }

    /**
     *   @notice This function fetches the twap of pool from the observation
     *   @param _pool: pool address
     **/
    function getTwap(address _pool) public view override returns (int24 twap) {
        IUniswapV3Pool uniswapV3Pool = IUniswapV3Pool(_pool);
        (
            ,
            ,
            uint16 observationIndex,
            uint16 observationCardinality,
            ,
            ,

        ) = uniswapV3Pool.slot0();
        (uint32 lastTimeStamp, , , ) = uniswapV3Pool.observations(
            (observationIndex + 1) % observationCardinality
        );
        uint32 timeDiff = uint32(block.timestamp) - lastTimeStamp;
        uint32 duration = poolStrategy[_pool].twapDuration;
        if (duration == 0) {
            duration = twapDuration;
        }
        twap = OracleLibrary.consult(
            _pool,
            timeDiff > duration ? duration : timeDiff
        );
    }

    /**
     *   @notice This function calculates the lower tick value from the current tick
     *   @param tick: current tick of the pool
     *   @param tickSpacing: tick spacing according to the fee tier
     **/
    function _floor(int24 tick, int24 tickSpacing)
        internal
        pure
        returns (int24)
    {
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }

    /**
     *   @notice This function fetches the current tick of the pool
     *   @param pool: pool address
     **/
    function getCurrentTick(address pool)
        internal
        view
        returns (int24 tick, int24 tickSpacing)
    {
        (, tick, , , , , ) = IUniswapV3PoolState(pool).slot0();
        tickSpacing = IUniswapV3Pool(pool).tickSpacing();
    }

    /**
     *   @notice This function validates that the updating strategy of the pool during the update
     *   @param _strategy: a value for baseThreshold
     *   @param _tickSpacing: spacing of tick according to fee tier
     **/
    function validateStrategy(int24 _strategy, int24 _tickSpacing)
        internal
        pure
    {
        require(
            _strategy <= TickMath.MAX_TICK &&
                _strategy % _tickSpacing == 0 &&
                _strategy > 0,
            "INS"
        );
    }
}
