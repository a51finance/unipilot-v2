// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.7.6;
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";

contract Pilot is ERC20Burnable {
    address public timelock;

    address private _minter;

    bool private _minterStatus;

    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 private constant EIP712DOMAIN_HASH =
        0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    // bytes32 private constant NAME_HASH = keccak256("Unipilot")
    bytes32 private constant NAME_HASH =
        0x96f8699b9d60ee03e2ae096e7ed75448335015f6b0f67e4f1540d650607f9ed9;

    // bytes32 private constant VERSION_HASH = keccak256("1")
    bytes32 private constant VERSION_HASH =
        0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6;

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    // keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267;

    modifier onlyMinter() {
        require(msg.sender == _minter, "PILOT:: NOT_MINTER");
        _;
    }

    modifier onlyTimelock() {
        require(msg.sender == timelock, "PILOT:: NOT_TIMELOCK");
        _;
    }

    mapping(address => uint256) public nonces;

    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor(
        address _timelock,
        address[] memory vestingAddresses,
        uint256[] memory vestingAmounts
    ) ERC20("Unipilot", "PILOT") {
        _mintInitialTokens(vestingAddresses, vestingAmounts);
        timelock = _timelock;
    }

    function mint(address to, uint256 value) external {
        _mint(to, value);
    }

    function updateMinter(address newMinter) external {
        require(!_minterStatus, "PILOT:: MINTER_ALREADY_INITIALIZED");
        require(newMinter != address(0), "PILOT:: INVALID_MINTER_ADDRESS");
        _minter = newMinter;
        _minterStatus = true;
    }

    function _mintInitialTokens(
        address[] memory _addresses,
        uint256[] memory _amounts
    ) internal {
        for (uint256 i = 0; i < _addresses.length; i++) {
            _mint(_addresses[i], _amounts[i]);
        }
    }

    function _validateSignedData(
        address signer,
        bytes32 encodeData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", getDomainSeparator(), encodeData)
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == signer,
            "PILOT:: INVALID_SIGNATURE"
        );
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "PILOT:: AUTH_EXPIRED");

        bytes32 encodeData = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                nonces[owner],
                deadline
            )
        );
        nonces[owner] = nonces[owner] + 1;
        _validateSignedData(owner, encodeData, v, r, s);
        _approve(owner, spender, value);
    }

    function getDomainSeparator() public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712DOMAIN_HASH,
                    NAME_HASH,
                    VERSION_HASH,
                    getChainId(),
                    address(this)
                )
            );
    }

    function getChainId() public view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp > validAfter, "PILOT:: AUTH_NOT_YET_VALID");
        require(block.timestamp < validBefore, "PILOT:: AUTH_EXPIRED");
        require(!authorizationState[from][nonce], "PILOT:: AUTH_ALREADY_USED");

        bytes32 encodeData = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );
        _validateSignedData(from, encodeData, v, r, s);

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }
}
