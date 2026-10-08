// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

/// Deploys IdentityRegistry. Reads from the environment:
///   DEPLOYER_PRIVATE_KEY  key that pays for the deployment
///   IDENTITY_OWNER        address allowed to rotate the attester
///   IDENTITY_ATTESTER     address of the backend's ATTESTATION_SIGNER_KEY
///   IDENTITY_RECOVERY_ATTESTER  address of the separate recovery signing key
///   IDENTITY_RECOVERY_DELAY     recovery timelock in seconds, 1 to 30 days
///
///   arc-forge script script/DeployIdentityRegistry.s.sol --rpc-url arc_testnet --broadcast
///   arc-forge script script/DeployIdentityRegistry.s.sol --rpc-url arc_mainnet --broadcast   (real USDC)
contract DeployIdentityRegistry is Script {
    function run() external returns (IdentityRegistry registry) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("IDENTITY_OWNER");
        address attester = vm.envAddress("IDENTITY_ATTESTER");
        address recoveryAttester = vm.envAddress("IDENTITY_RECOVERY_ATTESTER");
        uint256 recoveryDelay = vm.envUint("IDENTITY_RECOVERY_DELAY");

        vm.startBroadcast(deployerKey);
        registry = new IdentityRegistry(owner, attester, recoveryAttester, recoveryDelay);
        vm.stopBroadcast();

        console.log("IdentityRegistry:", address(registry));
    }
}
