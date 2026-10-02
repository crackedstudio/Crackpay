// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

/// @title IdentityRegistry
/// @notice Binds a CrackPay smart account to a phone hash and a handle.
/// @dev Registration needs an EIP-712 attestation from the backend, issued after
/// the phone number passes OTP verification. The phone hash is salted per user
/// off-chain, so this contract never sees a number and the phone mapping cannot
/// be enumerated from a list of numbers.
contract IdentityRegistry {
    struct Identity {
        bytes32 phoneHash;
        string handle;
    }

    bytes32 public constant REGISTRATION_TYPEHASH =
        keccak256("Registration(address account,bytes32 phoneHash,string handle,uint256 deadline)");
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("CrackPay IdentityRegistry");
    bytes32 private constant VERSION_HASH = keccak256("1");

    uint256 public constant MIN_HANDLE_LENGTH = 3;
    uint256 public constant MAX_HANDLE_LENGTH = 20;

    /// @dev secp256k1n / 2. Signatures with a higher s are rejected as malleable.
    uint256 private constant MAX_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    address public owner;
    address public pendingOwner;
    /// @notice Backend key that signs registration attestations.
    address public attester;

    /// @notice Destination an account has proposed moving its identity to.
    mapping(address account => address newAccount) public pendingAccount;

    mapping(address account => Identity) private _identities;
    mapping(bytes32 phoneHash => address account) private _accountByPhone;
    mapping(bytes32 handleHash => address account) private _accountByHandle;

    event Registered(address indexed account, bytes32 indexed phoneHash, string handle);
    event AccountUpdateProposed(address indexed account, address indexed newAccount);
    event AccountUpdated(address indexed previousAccount, address indexed newAccount, string handle);
    event AttesterUpdated(address indexed previousAttester, address indexed newAttester);
    event OwnershipTransferStarted(address indexed owner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error NotOwner();
    error NotPendingOwner();
    error AttestationExpired();
    error InvalidAttestation();
    error InvalidPhoneHash();
    error InvalidHandle();
    error AlreadyRegistered();
    error NotRegistered();
    error PhoneTaken();
    error HandleTaken();
    error NotPendingAccount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address attester_) {
        if (owner_ == address(0) || attester_ == address(0)) revert ZeroAddress();
        owner = owner_;
        attester = attester_;
        emit OwnershipTransferred(address(0), owner_);
        emit AttesterUpdated(address(0), attester_);
    }

    // ------------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------------

    /// @notice Registers the caller under a phone hash and a handle.
    /// @param phoneHash Per-user salted hash of the verified phone number.
    /// @param handle Lowercase handle, see `isValidHandle`.
    /// @param deadline Timestamp after which the attestation is no longer accepted.
    /// @param signature 65-byte attester signature over `registrationDigest`.
    function register(bytes32 phoneHash, string calldata handle, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert AttestationExpired();
        if (phoneHash == bytes32(0)) revert InvalidPhoneHash();
        if (!isValidHandle(handle)) revert InvalidHandle();
        if (_isRegistered(msg.sender)) revert AlreadyRegistered();
        if (_accountByPhone[phoneHash] != address(0)) revert PhoneTaken();

        bytes32 handleHash = keccak256(bytes(handle));
        if (_accountByHandle[handleHash] != address(0)) revert HandleTaken();

        bytes32 digest = registrationDigest(msg.sender, phoneHash, handle, deadline);
        if (_recover(digest, signature) != attester) revert InvalidAttestation();

        _identities[msg.sender] = Identity({phoneHash: phoneHash, handle: handle});
        _accountByPhone[phoneHash] = msg.sender;
        _accountByHandle[handleHash] = msg.sender;

        emit Registered(msg.sender, phoneHash, handle);
    }

    // ------------------------------------------------------------------
    // Account migration
    // ------------------------------------------------------------------

    /// @notice Proposes moving the caller's identity to `newAccount`.
    /// The move completes when `newAccount` calls `acceptAccount`, so an identity
    /// can never be pushed onto an address that did not ask for it.
    /// Pass the zero address to cancel a pending proposal.
    function updateAccount(address newAccount) external {
        if (!_isRegistered(msg.sender)) revert NotRegistered();
        if (newAccount != address(0) && _isRegistered(newAccount)) revert AlreadyRegistered();

        pendingAccount[msg.sender] = newAccount;
        emit AccountUpdateProposed(msg.sender, newAccount);
    }

    /// @notice Completes a move proposed by `previousAccount` to the caller.
    function acceptAccount(address previousAccount) external {
        if (pendingAccount[previousAccount] != msg.sender) revert NotPendingAccount();
        if (_isRegistered(msg.sender)) revert AlreadyRegistered();

        Identity memory identity = _identities[previousAccount];

        delete pendingAccount[previousAccount];
        delete _identities[previousAccount];

        _identities[msg.sender] = identity;
        _accountByPhone[identity.phoneHash] = msg.sender;
        _accountByHandle[keccak256(bytes(identity.handle))] = msg.sender;

        emit AccountUpdated(previousAccount, msg.sender, identity.handle);
    }

    // ------------------------------------------------------------------
    // Resolution
    // ------------------------------------------------------------------

    /// @return The account registered under `phoneHash`, or the zero address.
    function resolvePhone(bytes32 phoneHash) external view returns (address) {
        return _accountByPhone[phoneHash];
    }

    /// @return The account registered under `handle`, or the zero address.
    function resolveHandle(string calldata handle) external view returns (address) {
        return _accountByHandle[keccak256(bytes(handle))];
    }

    /// @return handle The handle of `account`, or an empty string.
    function reverse(address account) external view returns (string memory handle) {
        return _identities[account].handle;
    }

    /// @notice Handles are 3 to 20 characters of a-z, 0-9 and underscore, and
    /// start with a letter so they can never be mistaken for a phone number
    /// or an address.
    function isValidHandle(string calldata handle) public pure returns (bool) {
        bytes calldata chars = bytes(handle);
        uint256 length = chars.length;
        if (length < MIN_HANDLE_LENGTH || length > MAX_HANDLE_LENGTH) return false;
        if (!_isLowercaseLetter(chars[0])) return false;

        for (uint256 i = 1; i < length; ++i) {
            bytes1 char = chars[i];
            bool isDigit = char >= 0x30 && char <= 0x39;
            if (!_isLowercaseLetter(char) && !isDigit && char != 0x5f) return false;
        }
        return true;
    }

    /// @notice The EIP-712 digest the attester signs for a registration.
    function registrationDigest(address account, bytes32 phoneHash, string calldata handle, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        bytes32 structHash =
            keccak256(abi.encode(REGISTRATION_TYPEHASH, account, phoneHash, keccak256(bytes(handle)), deadline));
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
    }

    // ------------------------------------------------------------------
    // Administration
    // ------------------------------------------------------------------

    function setAttester(address newAttester) external onlyOwner {
        if (newAttester == address(0)) revert ZeroAddress();
        emit AttesterUpdated(attester, newAttester);
        attester = newAttester;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        delete pendingOwner;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _isRegistered(address account) private view returns (bool) {
        return _identities[account].phoneHash != bytes32(0);
    }

    function _isLowercaseLetter(bytes1 char) private pure returns (bool) {
        return char >= 0x61 && char <= 0x7a;
    }

    /// @dev Returns the zero address for any malformed signature. The attester
    /// is never the zero address, so that always fails the comparison.
    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);

        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        if (uint256(s) > MAX_S || (v != 27 && v != 28)) return address(0);

        return ecrecover(digest, v, r, s);
    }
}
