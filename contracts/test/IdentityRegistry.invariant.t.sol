// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

/// Drives the registry through random registrations, migrations and recoveries.
contract RegistryHandler is Test {
    IdentityRegistry public immutable registry;

    uint256 internal constant ATTESTER_KEY = 0xA77E57;
    uint256 internal constant RECOVERY_KEY = 0x4EC0FE4;
    uint256 internal constant ACTORS = 8;

    bytes32[] public phones;
    mapping(bytes32 phoneHash => string handle) public handleOf;
    uint256 public moves;

    constructor(IdentityRegistry registry_) {
        registry = registry_;
    }

    function phoneCount() external view returns (uint256) {
        return phones.length;
    }

    function _actor(uint256 seed) internal pure returns (address) {
        return address(uint160(0xA000 + (seed % ACTORS)));
    }

    function _sign(uint256 key, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function register(uint256 actorSeed) external {
        address account = _actor(actorSeed);
        bytes32 phoneHash = keccak256(abi.encode("phone", phones.length));
        string memory handle = string.concat("user", vm.toString(phones.length));
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _sign(ATTESTER_KEY, registry.registrationDigest(account, phoneHash, handle, deadline));

        vm.prank(account);
        try registry.register(phoneHash, handle, deadline, signature) {
            phones.push(phoneHash);
            handleOf[phoneHash] = handle;
        } catch {}
    }

    function migrate(uint256 phoneSeed, uint256 actorSeed) external {
        if (phones.length == 0) return;
        address current = registry.resolvePhone(phones[phoneSeed % phones.length]);
        address next = _actor(actorSeed);

        vm.prank(current);
        try registry.updateAccount(next) {} catch {}
        vm.prank(next);
        try registry.acceptAccount(current) {
            moves++;
        } catch {}
    }

    function initiateRecovery(uint256 phoneSeed, uint256 actorSeed) external {
        if (phones.length == 0) return;
        bytes32 phoneHash = phones[phoneSeed % phones.length];
        address next = _actor(actorSeed);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature =
            _sign(RECOVERY_KEY, registry.recoveryDigest(phoneHash, next, registry.recoveryNonce(phoneHash), deadline));

        vm.prank(next);
        try registry.initiateRecovery(phoneHash, deadline, signature) {} catch {}
    }

    function cancelRecovery(uint256 phoneSeed) external {
        if (phones.length == 0) return;
        bytes32 phoneHash = phones[phoneSeed % phones.length];
        vm.prank(registry.resolvePhone(phoneHash));
        try registry.cancelRecovery(phoneHash) {} catch {}
    }

    function finalizeRecovery(uint256 phoneSeed) external {
        if (phones.length == 0) return;
        bytes32 phoneHash = phones[phoneSeed % phones.length];
        (address next,,) = registry.recoveryOf(phoneHash);
        vm.prank(next);
        try registry.finalizeRecovery(phoneHash) {
            moves++;
        } catch {}
    }

    function warp(uint256 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 1 hours, 6 days));
    }
}

contract IdentityRegistryInvariantTest is Test {
    IdentityRegistry internal registry;
    RegistryHandler internal handler;

    function setUp() public {
        registry = new IdentityRegistry(makeAddr("owner"), vm.addr(0xA77E57), vm.addr(0x4EC0FE4), 3 days);
        handler = new RegistryHandler(registry);
        targetContract(address(handler));
    }

    /// Every identity ever registered still exists, whole, under exactly one account:
    /// phone, handle and reverse lookups all agree, and no two identities share an account.
    function invariant_IdentitiesStayWholeAndUnique() public view {
        uint256 count = handler.phoneCount();
        for (uint256 i = 0; i < count; ++i) {
            bytes32 phoneHash = handler.phones(i);
            string memory handle = handler.handleOf(phoneHash);
            address account = registry.resolvePhone(phoneHash);

            assertTrue(account != address(0), "identity vanished");
            assertEq(registry.resolveHandle(handle), account, "handle and phone disagree");
            assertEq(registry.reverse(account), handle, "reverse lookup disagrees");
            assertEq(registry.phoneHashOf(account), phoneHash, "account holds another identity");
        }
    }

    /// A pending recovery never names an account that would be finalizable while registered,
    /// and its window always follows its ready time.
    function invariant_RecoveryWindowsAreWellFormed() public view {
        uint256 count = handler.phoneCount();
        for (uint256 i = 0; i < count; ++i) {
            (address next, uint256 readyAt, uint256 expiresAt) = registry.recoveryOf(handler.phones(i));
            if (next == address(0)) continue;
            assertEq(expiresAt, readyAt + registry.RECOVERY_WINDOW());
            assertTrue(next != registry.resolvePhone(handler.phones(i)), "recovery names the current holder");
        }
    }
}
