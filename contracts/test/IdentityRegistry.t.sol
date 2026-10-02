// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry internal registry;

    uint256 internal constant ATTESTER_KEY = 0xA77E57;
    uint256 internal constant FORGER_KEY = 0xF0463D;
    uint256 internal constant RECOVERY_KEY = 0x4EC0FE4;
    uint256 internal constant DELAY = 3 days;
    address internal recoveryAttester = vm.addr(RECOVERY_KEY);
    address internal attester = vm.addr(ATTESTER_KEY);
    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal newAlice = makeAddr("new alice");

    bytes32 internal constant ALICE_PHONE = keccak256("alice phone");
    bytes32 internal constant BOB_PHONE = keccak256("bob phone");
    uint256 internal deadline;

    bytes internal constant FIRST_CHARS = "abcdefghijklmnopqrstuvwxyz";
    bytes internal constant REST_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_";

    function setUp() public {
        registry = new IdentityRegistry(owner, attester, recoveryAttester, DELAY);
        deadline = block.timestamp + 10 minutes;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    function _sign(uint256 key, address account, bytes32 phoneHash, string memory handle, uint256 deadline_)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(key, registry.registrationDigest(account, phoneHash, handle, deadline_));
        return abi.encodePacked(r, s, v);
    }

    function _register(address account, bytes32 phoneHash, string memory handle) internal {
        bytes memory signature = _sign(ATTESTER_KEY, account, phoneHash, handle, deadline);
        vm.prank(account);
        registry.register(phoneHash, handle, deadline, signature);
    }

    function _expectRegisterRevert(address account, bytes32 phoneHash, string memory handle, bytes4 selector) internal {
        bytes memory signature = _sign(ATTESTER_KEY, account, phoneHash, handle, deadline);
        vm.expectRevert(selector);
        vm.prank(account);
        registry.register(phoneHash, handle, deadline, signature);
    }

    /// Builds a handle that satisfies every rule, from fuzz input.
    function _validHandle(bytes32 seed, uint256 length) internal view returns (string memory) {
        length = bound(length, registry.MIN_HANDLE_LENGTH(), registry.MAX_HANDLE_LENGTH());
        bytes memory handle = new bytes(length);
        handle[0] = FIRST_CHARS[uint8(seed[0]) % FIRST_CHARS.length];
        for (uint256 i = 1; i < length; ++i) {
            handle[i] = REST_CHARS[uint8(seed[i]) % REST_CHARS.length];
        }
        return string(handle);
    }

    function _isAllowed(bytes1 char) internal pure returns (bool) {
        return (char >= 0x61 && char <= 0x7a) || (char >= 0x30 && char <= 0x39) || char == 0x5f;
    }

    // ------------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------------

    function test_ValidAttestationRegisters() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);

        vm.expectEmit();
        emit IdentityRegistry.Registered(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);

        assertEq(registry.resolvePhone(ALICE_PHONE), alice);
        assertEq(registry.resolveHandle("alice"), alice);
        assertEq(registry.reverse(alice), "alice");
    }

    function test_UnknownLookupsReturnEmpty() public view {
        assertEq(registry.resolvePhone(ALICE_PHONE), address(0));
        assertEq(registry.resolveHandle("alice"), address(0));
        assertEq(registry.reverse(alice), "");
    }

    function test_ForgedAttestationReverts() public {
        bytes memory signature = _sign(FORGER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_AttestationForAnotherAccountReverts() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(bob);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_AttestationForAnotherPhoneOrHandleReverts() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);

        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        registry.register(BOB_PHONE, "alice", deadline, signature);

        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alicia", deadline, signature);
    }

    function test_AttestationForAnotherChainReverts() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.chainId(block.chainid + 1);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_AttestationForAnotherRegistryReverts() public {
        IdentityRegistry other = new IdentityRegistry(owner, attester, recoveryAttester, DELAY);
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        other.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_ExpiredAttestationReverts() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);

        vm.warp(deadline);
        uint256 snapshot = vm.snapshotState();
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
        vm.revertToState(snapshot);

        vm.warp(deadline + 1);
        vm.expectRevert(IdentityRegistry.AttestationExpired.selector);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_MalformedSignaturesRevert() public {
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(ATTESTER_KEY, registry.registrationDigest(alice, ALICE_PHONE, "alice", deadline));

        bytes[] memory bad = new bytes[](5);
        bad[0] = "";
        bad[1] = abi.encodePacked(r, s);
        bad[2] = abi.encodePacked(r, s, v, uint8(0));
        bad[3] = abi.encodePacked(r, s, uint8(v - 27));
        // The same signature with s flipped to the high half of the curve.
        bad[4] = abi.encodePacked(
            r,
            bytes32(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - uint256(s)),
            v == 27 ? uint8(28) : uint8(27)
        );

        for (uint256 i = 0; i < bad.length; ++i) {
            vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
            vm.prank(alice);
            registry.register(ALICE_PHONE, "alice", deadline, bad[i]);
        }
    }

    function testFuzz_RandomSignatureReverts(bytes calldata signature) public {
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_DuplicateHandleReverts() public {
        _register(alice, ALICE_PHONE, "alice");
        _expectRegisterRevert(bob, BOB_PHONE, "alice", IdentityRegistry.HandleTaken.selector);
    }

    function test_DuplicatePhoneReverts() public {
        _register(alice, ALICE_PHONE, "alice");
        _expectRegisterRevert(bob, ALICE_PHONE, "bob", IdentityRegistry.PhoneTaken.selector);
    }

    function test_RegisteringTwiceReverts() public {
        _register(alice, ALICE_PHONE, "alice");
        _expectRegisterRevert(alice, BOB_PHONE, "alice2", IdentityRegistry.AlreadyRegistered.selector);
    }

    function test_ReplayedAttestationReverts() public {
        bytes memory signature = _sign(ATTESTER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.startPrank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
        vm.stopPrank();
    }

    function test_ZeroPhoneHashReverts() public {
        _expectRegisterRevert(alice, bytes32(0), "alice", IdentityRegistry.InvalidPhoneHash.selector);
    }

    // ------------------------------------------------------------------
    // Handle validation
    // ------------------------------------------------------------------

    function test_HandleExamples() public view {
        assertTrue(registry.isValidHandle("abc"));
        assertTrue(registry.isValidHandle("sam_01"));
        assertTrue(registry.isValidHandle("abcdefghijklmnopqrst"));

        assertFalse(registry.isValidHandle(""));
        assertFalse(registry.isValidHandle("ab"));
        assertFalse(registry.isValidHandle("abcdefghijklmnopqrstu"));
        assertFalse(registry.isValidHandle("Alice"));
        assertFalse(registry.isValidHandle("1alice"));
        assertFalse(registry.isValidHandle("_alice"));
        assertFalse(registry.isValidHandle("al ice"));
        assertFalse(registry.isValidHandle("al-ice"));
        assertFalse(registry.isValidHandle("al.ice"));
        assertFalse(registry.isValidHandle(unicode"alicé"));
        assertFalse(registry.isValidHandle("08012345678"));
    }

    function testFuzz_ValidHandleRegisters(bytes32 seed, uint256 length) public {
        string memory handle = _validHandle(seed, length);
        assertTrue(registry.isValidHandle(handle));

        _register(alice, ALICE_PHONE, handle);
        assertEq(registry.resolveHandle(handle), alice);
        assertEq(registry.reverse(alice), handle);
    }

    function testFuzz_DisallowedCharacterRejected(bytes32 seed, uint256 length, uint256 position, bytes1 char) public {
        vm.assume(!_isAllowed(char));
        bytes memory handle = bytes(_validHandle(seed, length));
        handle[bound(position, 0, handle.length - 1)] = char;

        assertFalse(registry.isValidHandle(string(handle)));
        _expectRegisterRevert(alice, ALICE_PHONE, string(handle), IdentityRegistry.InvalidHandle.selector);
    }

    function testFuzz_FirstCharacterMustBeLetter(bytes32 seed, uint256 length, uint8 pick) public {
        bytes memory handle = bytes(_validHandle(seed, length));
        handle[0] = bytes("0123456789_")[pick % 11];

        assertFalse(registry.isValidHandle(string(handle)));
        _expectRegisterRevert(alice, ALICE_PHONE, string(handle), IdentityRegistry.InvalidHandle.selector);
    }

    function testFuzz_LengthOutOfBoundsRejected(uint256 length) public {
        length = bound(length, 0, 64);
        vm.assume(length < registry.MIN_HANDLE_LENGTH() || length > registry.MAX_HANDLE_LENGTH());

        bytes memory handle = new bytes(length);
        for (uint256 i = 0; i < length; ++i) {
            handle[i] = "a";
        }

        assertFalse(registry.isValidHandle(string(handle)));
        _expectRegisterRevert(alice, ALICE_PHONE, string(handle), IdentityRegistry.InvalidHandle.selector);
    }

    /// Arbitrary bytes are valid exactly when they meet every rule.
    function testFuzz_ValidationMatchesRules(bytes calldata raw) public view {
        bool expected = raw.length >= 3 && raw.length <= 20 && raw[0] >= 0x61 && raw[0] <= 0x7a;
        for (uint256 i = 0; expected && i < raw.length; ++i) {
            expected = _isAllowed(raw[i]);
        }
        assertEq(registry.isValidHandle(string(raw)), expected);
    }

    // ------------------------------------------------------------------
    // Account migration
    // ------------------------------------------------------------------

    function test_AccountUpdatePreservesIdentity() public {
        _register(alice, ALICE_PHONE, "alice");

        vm.expectEmit();
        emit IdentityRegistry.AccountUpdateProposed(alice, newAlice);
        vm.prank(alice);
        registry.updateAccount(newAlice);

        // Nothing moves until the new account accepts.
        assertEq(registry.resolveHandle("alice"), alice);
        assertEq(registry.pendingAccount(alice), newAlice);

        vm.expectEmit();
        emit IdentityRegistry.AccountUpdated(alice, newAlice, "alice");
        vm.prank(newAlice);
        registry.acceptAccount(alice);

        assertEq(registry.resolvePhone(ALICE_PHONE), newAlice);
        assertEq(registry.resolveHandle("alice"), newAlice);
        assertEq(registry.reverse(newAlice), "alice");
        assertEq(registry.reverse(alice), "");
        assertEq(registry.pendingAccount(alice), address(0));
    }

    function test_OldAccountCanRegisterAgainAfterMoving() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.updateAccount(newAlice);
        vm.prank(newAlice);
        registry.acceptAccount(alice);

        // The moved identity stays taken; the vacated address is free to register a new one.
        _expectRegisterRevert(alice, ALICE_PHONE, "alice2", IdentityRegistry.PhoneTaken.selector);
        _expectRegisterRevert(alice, BOB_PHONE, "alice", IdentityRegistry.HandleTaken.selector);
        _register(alice, BOB_PHONE, "alice2");
        assertEq(registry.resolveHandle("alice2"), alice);
    }

    function test_UnregisteredAccountCannotPropose() public {
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        vm.prank(alice);
        registry.updateAccount(bob);
    }

    function test_CannotProposeARegisteredAccount() public {
        _register(alice, ALICE_PHONE, "alice");
        _register(bob, BOB_PHONE, "bob");
        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        vm.prank(alice);
        registry.updateAccount(bob);
    }

    function test_OnlyProposedAccountCanAccept() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.updateAccount(makeAddr("new alice"));

        vm.expectRevert(IdentityRegistry.NotPendingAccount.selector);
        vm.prank(bob);
        registry.acceptAccount(alice);
    }

    function test_CannotAcceptWithoutProposal() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.expectRevert(IdentityRegistry.NotPendingAccount.selector);
        vm.prank(bob);
        registry.acceptAccount(alice);

        // An unregistered account has no proposal either, including to address(0).
        vm.expectRevert(IdentityRegistry.NotPendingAccount.selector);
        vm.prank(bob);
        registry.acceptAccount(makeAddr("nobody"));
    }

    function test_ProposalCanBeCancelled() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.startPrank(alice);
        registry.updateAccount(newAlice);
        registry.updateAccount(address(0));
        vm.stopPrank();

        vm.expectRevert(IdentityRegistry.NotPendingAccount.selector);
        vm.prank(newAlice);
        registry.acceptAccount(alice);
    }

    function test_CannotAcceptAfterRegisteringSeparately() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.updateAccount(bob);
        _register(bob, BOB_PHONE, "bob");

        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        vm.prank(bob);
        registry.acceptAccount(alice);
    }

    function test_UnsolicitedProposalDoesNotBlockRegistration() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.updateAccount(bob);

        _register(bob, BOB_PHONE, "bob");
        assertEq(registry.resolveHandle("bob"), bob);
    }

    // ------------------------------------------------------------------
    // Recovery
    // ------------------------------------------------------------------

    function _signRecovery(uint256 key, bytes32 phoneHash, address newAccount, uint256 nonce, uint256 deadline_)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, registry.recoveryDigest(phoneHash, newAccount, nonce, deadline_));
        return abi.encodePacked(r, s, v);
    }

    /// Alice is registered and `newAccount` starts a recovery of her identity.
    function _initiate(address newAccount) internal returns (uint256 readyAt) {
        bytes memory signature =
            _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAccount, registry.recoveryNonce(ALICE_PHONE), deadline);
        vm.prank(newAccount);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
        (, readyAt,) = registry.recoveryOf(ALICE_PHONE);
    }

    function _assertAliceUnmoved() internal view {
        assertEq(registry.resolvePhone(ALICE_PHONE), alice);
        assertEq(registry.resolveHandle("alice"), alice);
        assertEq(registry.reverse(alice), "alice");
    }

    function test_RecoveryMovesIdentityAfterDelay() public {
        _register(alice, ALICE_PHONE, "alice");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);

        vm.expectEmit();
        emit IdentityRegistry.RecoveryInitiated(ALICE_PHONE, alice, newAlice, block.timestamp + DELAY);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);

        (address pendingNew, uint256 readyAt, uint256 expiresAt) = registry.recoveryOf(ALICE_PHONE);
        assertEq(pendingNew, newAlice);
        assertEq(readyAt, block.timestamp + DELAY);
        assertEq(expiresAt, readyAt + registry.RECOVERY_WINDOW());
        _assertAliceUnmoved();

        vm.warp(readyAt);
        vm.expectEmit();
        emit IdentityRegistry.RecoveryFinalized(ALICE_PHONE, alice, newAlice);
        vm.expectEmit();
        emit IdentityRegistry.AccountUpdated(alice, newAlice, "alice");
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);

        assertEq(registry.resolvePhone(ALICE_PHONE), newAlice);
        assertEq(registry.resolveHandle("alice"), newAlice);
        assertEq(registry.reverse(newAlice), "alice");
        assertEq(registry.phoneHashOf(newAlice), ALICE_PHONE);
        assertEq(registry.reverse(alice), "");
        assertEq(registry.phoneHashOf(alice), bytes32(0));
        (pendingNew,,) = registry.recoveryOf(ALICE_PHONE);
        assertEq(pendingNew, address(0));
    }

    function testFuzz_FinalizeOnlyInsideWindow(uint256 elapsed) public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 start = block.timestamp;
        uint256 readyAt = _initiate(newAlice);
        uint256 window = registry.RECOVERY_WINDOW();
        elapsed = bound(elapsed, 0, DELAY + window + 30 days);

        vm.warp(start + elapsed);
        if (elapsed < DELAY) {
            vm.expectRevert(IdentityRegistry.RecoveryNotReady.selector);
        } else if (elapsed > DELAY + window) {
            vm.expectRevert(IdentityRegistry.RecoveryExpired.selector);
        }
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);

        bool moved = elapsed >= DELAY && elapsed <= DELAY + window;
        assertEq(registry.resolveHandle("alice"), moved ? newAlice : alice);
        assertEq(readyAt, start + DELAY);
    }

    function test_CurrentAccountCancelsRecovery() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);

        vm.expectEmit();
        emit IdentityRegistry.RecoveryCancelled(ALICE_PHONE, newAlice, alice);
        vm.prank(alice);
        registry.cancelRecovery(ALICE_PHONE);

        vm.warp(readyAt);
        vm.expectRevert(IdentityRegistry.NoPendingRecovery.selector);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);
        _assertAliceUnmoved();
    }

    function test_OwnerCancelsRecovery() public {
        _register(alice, ALICE_PHONE, "alice");
        _initiate(newAlice);

        vm.prank(owner);
        registry.cancelRecovery(ALICE_PHONE);
        (address pendingNew,,) = registry.recoveryOf(ALICE_PHONE);
        assertEq(pendingNew, address(0));
    }

    function test_OthersCannotCancelRecovery() public {
        _register(alice, ALICE_PHONE, "alice");
        _initiate(newAlice);

        address[3] memory callers = [bob, newAlice, recoveryAttester];
        for (uint256 i = 0; i < callers.length; ++i) {
            vm.expectRevert(IdentityRegistry.NotAuthorized.selector);
            vm.prank(callers[i]);
            registry.cancelRecovery(ALICE_PHONE);
        }
    }

    function test_CancelWithoutRecoveryReverts() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.expectRevert(IdentityRegistry.NoPendingRecovery.selector);
        vm.prank(alice);
        registry.cancelRecovery(ALICE_PHONE);
    }

    function test_CancelledAttestationCannotBeReplayed() public {
        _register(alice, ALICE_PHONE, "alice");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
        vm.prank(alice);
        registry.cancelRecovery(ALICE_PHONE);

        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);

        // A fresh attestation for the next nonce works.
        assertEq(registry.recoveryNonce(ALICE_PHONE), 1);
        _initiate(newAlice);
    }

    function test_RecoveryNeedsTheRecoveryKey() public {
        _register(alice, ALICE_PHONE, "alice");

        // Neither a stranger's key nor the registration attester's key is accepted.
        uint256[2] memory keys = [FORGER_KEY, ATTESTER_KEY];
        for (uint256 i = 0; i < keys.length; ++i) {
            bytes memory signature = _signRecovery(keys[i], ALICE_PHONE, newAlice, 0, deadline);
            vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
            vm.prank(newAlice);
            registry.initiateRecovery(ALICE_PHONE, deadline, signature);
        }
        assertEq(registry.recoveryNonce(ALICE_PHONE), 0);
    }

    function test_RegistrationKeyCompromiseCannotRecover() public {
        // A registration attestation shaped like a recovery is a different typed struct.
        _register(alice, ALICE_PHONE, "alice");
        bytes memory signature = _sign(ATTESTER_KEY, newAlice, ALICE_PHONE, "alice", deadline);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
    }

    function test_RecoveryAttestationIsBoundToItsFields() public {
        _register(alice, ALICE_PHONE, "alice");
        _register(bob, BOB_PHONE, "bob");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);

        // Another caller.
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(makeAddr("mallory"));
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);

        // Another identity.
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(BOB_PHONE, deadline, signature);

        // Another deadline.
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline + 1, signature);
    }

    function test_ExpiredRecoveryAttestationReverts() public {
        _register(alice, ALICE_PHONE, "alice");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(IdentityRegistry.AttestationExpired.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
    }

    function test_CannotRecoverUnknownIdentity() public {
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);
        vm.expectRevert(IdentityRegistry.NotRegistered.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
    }

    function test_RegisteredAccountCannotRecoverAnother() public {
        _register(alice, ALICE_PHONE, "alice");
        _register(bob, BOB_PHONE, "bob");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, bob, 0, deadline);
        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        vm.prank(bob);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
    }

    function test_SecondRecoveryBlockedWhileOnePending() public {
        _register(alice, ALICE_PHONE, "alice");
        _initiate(newAlice);

        address mallory = makeAddr("mallory");
        bytes memory signature = _signRecovery(RECOVERY_KEY, ALICE_PHONE, mallory, 1, deadline);
        vm.expectRevert(IdentityRegistry.RecoveryAlreadyPending.selector);
        vm.prank(mallory);
        registry.initiateRecovery(ALICE_PHONE, deadline, signature);
    }

    function test_ExpiredRecoveryCanBeReplaced() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);
        vm.warp(readyAt + registry.RECOVERY_WINDOW() + 1);

        address newerAlice = makeAddr("newer alice");
        deadline = block.timestamp + 10 minutes;
        _initiate(newerAlice);
        (address pendingNew,,) = registry.recoveryOf(ALICE_PHONE);
        assertEq(pendingNew, newerAlice);
    }

    function test_OnlyNamedAccountFinalizes() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);
        vm.warp(readyAt);

        vm.expectRevert(IdentityRegistry.NotRecoveryAccount.selector);
        vm.prank(bob);
        registry.finalizeRecovery(ALICE_PHONE);
    }

    function test_CannotFinalizeAfterRegisteringSeparately() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);
        _register(newAlice, BOB_PHONE, "other");

        vm.warp(readyAt);
        vm.expectRevert(IdentityRegistry.AlreadyRegistered.selector);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);
    }

    function test_MigrationDropsPendingRecovery() public {
        // Alice still has her account, so she migrates; the attacker's recovery dies with it.
        _register(alice, ALICE_PHONE, "alice");
        address mallory = makeAddr("mallory");
        uint256 readyAt = _initiate(mallory);

        vm.prank(alice);
        registry.updateAccount(newAlice);
        vm.prank(newAlice);
        registry.acceptAccount(alice);

        vm.warp(readyAt);
        vm.expectRevert(IdentityRegistry.NoPendingRecovery.selector);
        vm.prank(mallory);
        registry.finalizeRecovery(ALICE_PHONE);
        assertEq(registry.resolveHandle("alice"), newAlice);
    }

    function test_RecoveryClearsPendingMigration() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(alice);
        registry.updateAccount(bob);

        uint256 readyAt = _initiate(newAlice);
        vm.warp(readyAt);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);

        assertEq(registry.pendingAccount(alice), address(0));
        vm.expectRevert(IdentityRegistry.NotPendingAccount.selector);
        vm.prank(bob);
        registry.acceptAccount(alice);
    }

    function test_RecoveredAccountCanCancelLaterRecovery() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);
        vm.warp(readyAt);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);

        // The old account no longer has any say; the new holder does.
        deadline = block.timestamp + 10 minutes;
        _initiate(makeAddr("mallory"));
        vm.expectRevert(IdentityRegistry.NotAuthorized.selector);
        vm.prank(alice);
        registry.cancelRecovery(ALICE_PHONE);
        vm.prank(newAlice);
        registry.cancelRecovery(ALICE_PHONE);
    }

    function test_PauseBlocksInitiateAndFinalizeButNotCancel() public {
        _register(alice, ALICE_PHONE, "alice");
        _register(bob, BOB_PHONE, "bob");
        uint256 readyAt = _initiate(newAlice);

        vm.expectRevert(IdentityRegistry.NotOwner.selector);
        vm.prank(alice);
        registry.setRecoveryPaused(true);

        vm.prank(owner);
        registry.setRecoveryPaused(true);

        vm.warp(readyAt);
        vm.expectRevert(IdentityRegistry.RecoveryIsPaused.selector);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);

        address newBob = makeAddr("new bob");
        deadline = block.timestamp + 10 minutes;
        bytes memory signature = _signRecovery(RECOVERY_KEY, BOB_PHONE, newBob, 0, deadline);
        vm.expectRevert(IdentityRegistry.RecoveryIsPaused.selector);
        vm.prank(newBob);
        registry.initiateRecovery(BOB_PHONE, deadline, signature);

        vm.prank(alice);
        registry.cancelRecovery(ALICE_PHONE);

        // Registration and migration are unaffected by the pause.
        _register(makeAddr("carol"), keccak256("carol phone"), "carol");
        vm.prank(bob);
        registry.updateAccount(newBob);
        vm.prank(newBob);
        registry.acceptAccount(bob);
        assertEq(registry.resolveHandle("bob"), newBob);
    }

    function test_DelayChangeDoesNotAffectPendingRecovery() public {
        _register(alice, ALICE_PHONE, "alice");
        uint256 readyAt = _initiate(newAlice);

        vm.prank(owner);
        registry.setRecoveryDelay(1 days);
        (, uint256 readyAfter,) = registry.recoveryOf(ALICE_PHONE);
        assertEq(readyAfter, readyAt);

        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(IdentityRegistry.RecoveryNotReady.selector);
        vm.prank(newAlice);
        registry.finalizeRecovery(ALICE_PHONE);
    }

    function test_RecoveryDelayGuards() public {
        vm.expectRevert(IdentityRegistry.NotOwner.selector);
        vm.prank(alice);
        registry.setRecoveryDelay(2 days);

        vm.startPrank(owner);
        vm.expectRevert(IdentityRegistry.InvalidRecoveryDelay.selector);
        registry.setRecoveryDelay(1 days - 1);
        vm.expectRevert(IdentityRegistry.InvalidRecoveryDelay.selector);
        registry.setRecoveryDelay(30 days + 1);
        registry.setRecoveryDelay(30 days);
        vm.stopPrank();
        assertEq(registry.recoveryDelay(), 30 days);
    }

    function test_OwnerRotatesRecoveryAttester() public {
        _register(alice, ALICE_PHONE, "alice");
        vm.prank(owner);
        registry.setRecoveryAttester(vm.addr(FORGER_KEY));

        bytes memory stale = _signRecovery(RECOVERY_KEY, ALICE_PHONE, newAlice, 0, deadline);
        vm.expectRevert(IdentityRegistry.InvalidAttestation.selector);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, stale);

        bytes memory fresh = _signRecovery(FORGER_KEY, ALICE_PHONE, newAlice, 0, deadline);
        vm.prank(newAlice);
        registry.initiateRecovery(ALICE_PHONE, deadline, fresh);
    }

    function test_AttesterKeysStaySeparate() public {
        vm.expectRevert(IdentityRegistry.NotOwner.selector);
        vm.prank(alice);
        registry.setRecoveryAttester(alice);

        vm.startPrank(owner);
        vm.expectRevert(IdentityRegistry.ZeroAddress.selector);
        registry.setRecoveryAttester(address(0));
        vm.expectRevert(IdentityRegistry.AttestersMustDiffer.selector);
        registry.setRecoveryAttester(attester);
        vm.expectRevert(IdentityRegistry.AttestersMustDiffer.selector);
        registry.setAttester(recoveryAttester);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Administration
    // ------------------------------------------------------------------

    function test_ConstructorGuards() public {
        vm.expectRevert(IdentityRegistry.ZeroAddress.selector);
        new IdentityRegistry(address(0), attester, recoveryAttester, DELAY);
        vm.expectRevert(IdentityRegistry.ZeroAddress.selector);
        new IdentityRegistry(owner, address(0), recoveryAttester, DELAY);
        vm.expectRevert(IdentityRegistry.ZeroAddress.selector);
        new IdentityRegistry(owner, attester, address(0), DELAY);
        vm.expectRevert(IdentityRegistry.AttestersMustDiffer.selector);
        new IdentityRegistry(owner, attester, attester, DELAY);
        vm.expectRevert(IdentityRegistry.InvalidRecoveryDelay.selector);
        new IdentityRegistry(owner, attester, recoveryAttester, 1 days - 1);
        vm.expectRevert(IdentityRegistry.InvalidRecoveryDelay.selector);
        new IdentityRegistry(owner, attester, recoveryAttester, 30 days + 1);
    }

    function test_OwnerRotatesAttester() public {
        address newAttester = vm.addr(FORGER_KEY);
        vm.prank(owner);
        registry.setAttester(newAttester);

        // The old attester's signatures stop working; the new one's work.
        _expectRegisterRevert(alice, ALICE_PHONE, "alice", IdentityRegistry.InvalidAttestation.selector);
        bytes memory signature = _sign(FORGER_KEY, alice, ALICE_PHONE, "alice", deadline);
        vm.prank(alice);
        registry.register(ALICE_PHONE, "alice", deadline, signature);
    }

    function test_SetAttesterGuards() public {
        vm.expectRevert(IdentityRegistry.NotOwner.selector);
        vm.prank(alice);
        registry.setAttester(alice);

        vm.expectRevert(IdentityRegistry.ZeroAddress.selector);
        vm.prank(owner);
        registry.setAttester(address(0));
    }

    function test_OwnershipTransferIsTwoStep() public {
        vm.expectRevert(IdentityRegistry.NotOwner.selector);
        vm.prank(alice);
        registry.transferOwnership(alice);

        vm.prank(owner);
        registry.transferOwnership(alice);
        assertEq(registry.owner(), owner);

        vm.expectRevert(IdentityRegistry.NotPendingOwner.selector);
        vm.prank(bob);
        registry.acceptOwnership();

        vm.prank(alice);
        registry.acceptOwnership();
        assertEq(registry.owner(), alice);
        assertEq(registry.pendingOwner(), address(0));
    }

    // ------------------------------------------------------------------
    // EIP-712 interop
    // ------------------------------------------------------------------

    /// Pins the digest for fixed inputs so the backend's typed-data signer can be
    /// checked against it. Expected value computed with viem's hashTypedData.
    function test_DigestMatchesViem() public {
        vm.chainId(5042002);
        IdentityRegistry pinned = IdentityRegistry(0x1111111111111111111111111111111111111111);
        vm.etch(address(pinned), address(registry).code);

        bytes32 digest = pinned.registrationDigest(
            0x2222222222222222222222222222222222222222, bytes32(uint256(0x1234)), "alice", 1_800_000_000
        );
        assertEq(digest, VIEM_DIGEST);
    }

    function test_RecoveryDigestMatchesViem() public {
        vm.chainId(5042002);
        IdentityRegistry pinned = IdentityRegistry(0x1111111111111111111111111111111111111111);
        vm.etch(address(pinned), address(registry).code);

        bytes32 digest = pinned.recoveryDigest(
            bytes32(uint256(0x1234)), 0x3333333333333333333333333333333333333333, 7, 1_800_000_000
        );
        assertEq(digest, VIEM_RECOVERY_DIGEST);
    }

    bytes32 internal constant VIEM_RECOVERY_DIGEST = 0x81f43f41239e9fdcf5e261cde81ebb112a3df29a7c67e545d292af9296a00aa3;
    bytes32 internal constant VIEM_DIGEST = 0x490f06b4f3b88a9a550ae94176497dda7b449c7cede70d630a529edb67f45e7e;
}
