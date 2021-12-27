// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.7.6;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/IERC20Burnable.sol";

contract IndexFund {
    using SafeERC20 for IERC20Burnable;

    address private constant PILOT_ADDRESS =
        0x2e53716051bE4BCCE9F546fcfb0ef7632E505DBD; //unit test addr

    address private _timelock;

    uint256 private constant PRECISION = 10**18;

    address[] public lockedFundAddresses;

    mapping(bytes32 => bool) private withdraws;

    event Withdrawn(
        address indexed tokenAddress,
        uint256 indexed pilotAmount,
        uint256 indexed tokenAmount,
        uint256 circulatingPilotSupply
    );

    modifier onlyTimelock() {
        require(msg.sender == _timelock, "INDEX_FUND:: NOT_TIMELOCK");
        _;
    }

    constructor(address _timelockAddress, address[] memory _lockedFundAddresses)
    {
        _timelock = _timelockAddress;
        lockedFundAddresses = _lockedFundAddresses;
    }

    function withdraw(address[] memory _tokenAddresses, uint256 _pilotAmount)
        external
    {
        uint256 pilotPercentage;

        uint256 circulatingPilotSupply = circulatingSupply();

        uint256 timestamp = block.timestamp;

        address payable sender = payable(msg.sender);

        address contractAddress = address(this);

        pilotPercentage = (_pilotAmount * PRECISION) / circulatingPilotSupply;

        IERC20Burnable(PILOT_ADDRESS).burnFrom(sender, _pilotAmount);

        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            bytes32 withdrawnId = keccak256(
                abi.encode(_tokenAddresses[i], sender, timestamp)
            );
            require(
                withdraws[withdrawnId] == false,
                "INDEXFUND:: TOKEN_ALREADY_WITHDRAWN"
            );

            uint256 tokenPercentageToTransfer = _getTokenPercentage(
                _tokenAddresses[i],
                contractAddress,
                pilotPercentage
            );

            withdraws[withdrawnId] = true;

            _tokenAddresses[i] == address(0)
                ? sender.transfer(tokenPercentageToTransfer)
                : IERC20Burnable(_tokenAddresses[i]).safeTransfer(
                    sender,
                    tokenPercentageToTransfer
                );

            emit Withdrawn(
                _tokenAddresses[i],
                _pilotAmount,
                tokenPercentageToTransfer,
                circulatingPilotSupply
            );
        }
    }

    function addLockedFundsAddresses(address[] memory _accounts)
        external
        onlyTimelock
    {
        for (uint24 i = 0; i < _accounts.length; i++) {
            require(_accounts[i] != address(0), "INDEX_FUND:: ZERO_ADDRESS");
            lockedFundAddresses.push(_accounts[i]);
        }
    }

    function removeLockedFundsAddress(uint256 _index) external onlyTimelock {
        require(
            lockedFundAddresses[_index] != address(0),
            "INDEX_FUND:: ELEMENT_NOT_EXISTS"
        );
        delete lockedFundAddresses[_index];
    }

    function migrateFunds(
        address payable _newVersion,
        address[] calldata tokens
    ) external onlyTimelock {
        address thisContract = address(this);

        for (uint24 i = 0; i < tokens.length; i++) {
            IERC20Burnable(tokens[i]).safeTransfer(
                _newVersion,
                IERC20Burnable(tokens[i]).balanceOf(thisContract)
            );
        }

        if (thisContract.balance > 0) {
            _newVersion.transfer(thisContract.balance);
        }
    }

    function circulatingSupply() public view returns (uint256 supply) {
        uint256 totalLocked;
        for (uint24 i = 0; i < lockedFundAddresses.length; i++) {
            totalLocked += IERC20Burnable(PILOT_ADDRESS).balanceOf(
                lockedFundAddresses[i]
            );
        }
        supply = IERC20Burnable(PILOT_ADDRESS).totalSupply() - totalLocked;
    }

    function _getTokenPercentage(
        address _tokenAddress,
        address _contractAddress,
        uint256 _pilotPercentage
    ) internal view returns (uint256 tokenPercentageToTransfer) {
        uint256 balance = _tokenAddress == address(0)
            ? _contractAddress.balance
            : IERC20(_tokenAddress).balanceOf(_contractAddress);

        require(balance > 0, "INDEXFUND:: ZERO_BALANCE");

        tokenPercentageToTransfer = (balance * _pilotPercentage) / PRECISION;
    }

    fallback() external payable {}

    receive() external payable {}
}
