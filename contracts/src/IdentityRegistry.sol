// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title IdentityRegistry
/// @notice Binds a CrackPay smart account to a phone hash and a handle.
/// @dev Registration needs an EIP-712 attestation from the backend, issued after
/// the phone number passes OTP verification. The phone hash is salted per user
/// off-chain, so this contract never sees a number and the phone mapping cannot
/// be enumerated from a list of numbers.
///
/// An identity can move to a new account in two ways:
///  - Migration: the current account proposes, the new account accepts.
///  - Recovery: for a user who has lost the current account. The new account
///    presents an attestation from a separate recovery key, then waits out a
///    timelock during which the current account or the owner can cancel.
/// Neither path moves funds; they only change where the identity resolves.
contract IdentityRegistry is Ownable2Step, EIP712 {
    struct Identity {
        bytes32 phoneHash;
        string handle;
    }

    struct Recovery {
        address newAccount;
        uint64 readyAt;
    }

    bytes32 public constant REGISTRATION_TYPEHASH =
        keccak256("Registration(address account,bytes32 phoneHash,string handle,uint256 deadline)");
    bytes32 public constant RECOVERY_TYPEHASH =
        keccak256("Recovery(bytes32 phoneHash,address newAccount,uint256 nonce,uint256 deadline)");

    uint256 public constant MIN_HANDLE_LENGTH = 3;
    uint256 public constant MAX_HANDLE_LENGTH = 20;

    uint256 public constant MIN_RECOVERY_DELAY = 1 days;
    uint256 public constant MAX_RECOVERY_DELAY = 30 days;
    /// @notice How long a recovery stays executable once its timelock has passed.
    uint256 public constant RECOVERY_WINDOW = 7 days;

    /// @notice Backend key that signs registration attestations.
    address public attester;
    /// @notice Key that signs recovery attestations. Always distinct from `attester`.
    address public recoveryAttester;
    /// @notice Timelock applied to recoveries started from now on.
    uint256 public recoveryDelay;
    /// @notice When true, recoveries can be neither started nor finalized.
    bool public recoveryPaused;

    /// @notice Destination an account has proposed moving its identity to.
    mapping(address account => address newAccount) public pendingAccount;
    /// @notice Next nonce a recovery attestation for this identity must carry.
    mapping(bytes32 phoneHash => uint256 nonce) public recoveryNonce;

    mapping(address account => Identity) private _identities;
    mapping(bytes32 phoneHash => address account) private _accountByPhone;
    mapping(bytes32 handleHash => address account) private _accountByHandle;
    mapping(bytes32 phoneHash => Recovery) private _recoveries;

    event Registered(address indexed account, bytes32 indexed phoneHash, string handle);
    event AccountUpdateProposed(address indexed account, address indexed newAccount);
    event AccountUpdated(address indexed previousAccount, address indexed newAccount, string handle);
    event RecoveryInitiated(
        bytes32 indexed phoneHash, address indexed currentAccount, address indexed newAccount, uint256 readyAt
    );
    event RecoveryCancelled(bytes32 indexed phoneHash, address indexed newAccount, address indexed cancelledBy);
    event RecoveryFinalized(bytes32 indexed phoneHash, address indexed previousAccount, address indexed newAccount);
    event AttesterUpdated(address indexed previousAttester, address indexed newAttester);
    event RecoveryAttesterUpdated(address indexed previousAttester, address indexed newAttester);
    event RecoveryDelayUpdated(uint256 previousDelay, uint256 newDelay);
    event RecoveryPausedSet(bool paused);

    error ZeroAddress();
    error AttestationExpired();
    error InvalidAttestation();
    error InvalidPhoneHash();
    error InvalidHandle();
    error AlreadyRegistered();
    error NotRegistered();
    error PhoneTaken();
    error HandleTaken();
    error NotPendingAccount();
    error AttestersMustDiffer();
    error InvalidRecoveryDelay();
    error RecoveryIsPaused();
    error RecoveryAlreadyPending();
    error NoPendingRecovery();
    error NotRecoveryAccount();
    error RecoveryNotReady();
    error RecoveryExpired();
    error NotAuthorized();
    error RenounceDisabled();

    modifier whenRecoveryActive() {
        if (recoveryPaused) revert RecoveryIsPaused();
        _;
    }

    constructor(address owner_, address attester_, address recoveryAttester_, uint256 recoveryDelay_)
        Ownable(owner_)
        EIP712("CrackPay IdentityRegistry", "1")
    {
        if (attester_ == address(0) || recoveryAttester_ == address(0)) revert ZeroAddress();
        if (attester_ == recoveryAttester_) revert AttestersMustDiffer();
        _checkRecoveryDelay(recoveryDelay_);

        attester = attester_;
        recoveryAttester = recoveryAttester_;
        recoveryDelay = recoveryDelay_;

        emit AttesterUpdated(address(0), attester_);
        emit RecoveryAttesterUpdated(address(0), recoveryAttester_);
        emit RecoveryDelayUpdated(0, recoveryDelay_);
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
    // Migration: the user still controls the current account
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
    /// Also drops any recovery pending against the identity.
    function acceptAccount(address previousAccount) external {
        if (pendingAccount[previousAccount] != msg.sender) revert NotPendingAccount();
        if (_isRegistered(msg.sender)) revert AlreadyRegistered();

        _move(previousAccount, msg.sender);
    }

    // ------------------------------------------------------------------
    // Recovery: the user has lost the current account
    // ------------------------------------------------------------------

    /// @notice Starts moving the identity behind `phoneHash` to the caller.
    /// @dev Needs a recovery attestation naming the caller and the identity's
    /// current nonce. Nothing moves until `recoveryDelay` has passed, and the
    /// current account or the owner can cancel at any point before then.
    function initiateRecovery(bytes32 phoneHash, uint256 deadline, bytes calldata signature)
        external
        whenRecoveryActive
    {
        if (block.timestamp > deadline) revert AttestationExpired();
        address currentAccount = _accountByPhone[phoneHash];
        if (currentAccount == address(0)) revert NotRegistered();
        if (_isRegistered(msg.sender)) revert AlreadyRegistered();

        Recovery memory pending = _recoveries[phoneHash];
        if (pending.newAccount != address(0) && block.timestamp <= pending.readyAt + RECOVERY_WINDOW) {
            revert RecoveryAlreadyPending();
        }

        // Consuming the nonce here means an attestation starts at most one recovery.
        uint256 nonce = recoveryNonce[phoneHash]++;
        bytes32 digest = recoveryDigest(phoneHash, msg.sender, nonce, deadline);
        if (_recover(digest, signature) != recoveryAttester) revert InvalidAttestation();

        uint64 readyAt = uint64(block.timestamp + recoveryDelay);
        _recoveries[phoneHash] = Recovery({newAccount: msg.sender, readyAt: readyAt});

        emit RecoveryInitiated(phoneHash, currentAccount, msg.sender, readyAt);
    }

    /// @notice Cancels the recovery pending against `phoneHash`.
    /// Callable by the identity's current account or by the owner.
    function cancelRecovery(bytes32 phoneHash) external {
        address newAccount = _recoveries[phoneHash].newAccount;
        if (newAccount == address(0)) revert NoPendingRecovery();
        if (msg.sender != _accountByPhone[phoneHash] && msg.sender != owner()) revert NotAuthorized();

        delete _recoveries[phoneHash];
        emit RecoveryCancelled(phoneHash, newAccount, msg.sender);
    }

    /// @notice Completes a recovery once its timelock has passed.
    /// Callable only by the account the recovery names, within `RECOVERY_WINDOW`.
    function finalizeRecovery(bytes32 phoneHash) external whenRecoveryActive {
        Recovery memory pending = _recoveries[phoneHash];
        if (pending.newAccount == address(0)) revert NoPendingRecovery();
        if (pending.newAccount != msg.sender) revert NotRecoveryAccount();
        if (block.timestamp < pending.readyAt) revert RecoveryNotReady();
        if (block.timestamp > pending.readyAt + RECOVERY_WINDOW) revert RecoveryExpired();
        if (_isRegistered(msg.sender)) revert AlreadyRegistered();

        address previousAccount = _accountByPhone[phoneHash];
        emit RecoveryFinalized(phoneHash, previousAccount, msg.sender);
        _move(previousAccount, msg.sender);
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

    /// @return phoneHash The phone hash of `account`, or zero.
    function phoneHashOf(address account) external view returns (bytes32 phoneHash) {
        return _identities[account].phoneHash;
    }

    /// @notice The recovery pending against `phoneHash`, if any.
    /// @return newAccount Zero when nothing is pending.
    /// @return readyAt Earliest time it can be finalized.
    /// @return expiresAt Latest time it can be finalized.
    function recoveryOf(bytes32 phoneHash)
        external
        view
        returns (address newAccount, uint256 readyAt, uint256 expiresAt)
    {
        Recovery memory pending = _recoveries[phoneHash];
        if (pending.newAccount == address(0)) return (address(0), 0, 0);
        return (pending.newAccount, pending.readyAt, pending.readyAt + RECOVERY_WINDOW);
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
        return _hashTypedDataV4(
            keccak256(abi.encode(REGISTRATION_TYPEHASH, account, phoneHash, keccak256(bytes(handle)), deadline))
        );
    }

    /// @notice The EIP-712 digest the recovery attester signs for a recovery.
    function recoveryDigest(bytes32 phoneHash, address newAccount, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(RECOVERY_TYPEHASH, phoneHash, newAccount, nonce, deadline)));
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ------------------------------------------------------------------
    // Administration
    // ------------------------------------------------------------------

    function setAttester(address newAttester) external onlyOwner {
        if (newAttester == address(0)) revert ZeroAddress();
        if (newAttester == recoveryAttester) revert AttestersMustDiffer();
        emit AttesterUpdated(attester, newAttester);
        attester = newAttester;
    }

    function setRecoveryAttester(address newAttester) external onlyOwner {
        if (newAttester == address(0)) revert ZeroAddress();
        if (newAttester == attester) revert AttestersMustDiffer();
        emit RecoveryAttesterUpdated(recoveryAttester, newAttester);
        recoveryAttester = newAttester;
    }

    /// @notice Changes the timelock for recoveries started after this call.
    /// Recoveries already pending keep the delay they started with.
    function setRecoveryDelay(uint256 newDelay) external onlyOwner {
        _checkRecoveryDelay(newDelay);
        emit RecoveryDelayUpdated(recoveryDelay, newDelay);
        recoveryDelay = newDelay;
    }

    /// @notice Circuit breaker for a compromised recovery key. Cancelling stays
    /// possible while paused.
    function setRecoveryPaused(bool paused) external onlyOwner {
        recoveryPaused = paused;
        emit RecoveryPausedSet(paused);
    }

    /// @notice Disabled. Without an owner the attester keys could never be rotated
    /// and recovery could never be paused.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /// @dev Moves the whole identity and clears every pending change against it.
    function _move(address previousAccount, address newAccount) private {
        Identity memory identity = _identities[previousAccount];

        delete pendingAccount[previousAccount];
        delete _identities[previousAccount];
        delete _recoveries[identity.phoneHash];

        _identities[newAccount] = identity;
        _accountByPhone[identity.phoneHash] = newAccount;
        _accountByHandle[keccak256(bytes(identity.handle))] = newAccount;

        emit AccountUpdated(previousAccount, newAccount, identity.handle);
    }

    function _isRegistered(address account) private view returns (bool) {
        return _identities[account].phoneHash != bytes32(0);
    }

    function _checkRecoveryDelay(uint256 delay) private pure {
        if (delay < MIN_RECOVERY_DELAY || delay > MAX_RECOVERY_DELAY) revert InvalidRecoveryDelay();
    }

    function _isLowercaseLetter(bytes1 char) private pure returns (bool) {
        return char >= 0x61 && char <= 0x7a;
    }

    /// @dev Returns the zero address for any malformed signature. Neither
    /// attester is ever the zero address, so that always fails the comparison.
    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address signer) {
        (signer,,) = ECDSA.tryRecoverCalldata(digest, signature);
    }
}
