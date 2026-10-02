// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

/// Deploys IdentityRegistry. Reads from the environment:
///   DEPLOYER_PRIVATE_KEY  key that pays for the deployment
///   IDENTITY_OWNER        address allowed to rotate the attester
///   IDENTITY_ATTESTER     address of the backend's ATTESTATION_SIGNER_KEY
///
///   arc-forge script script/DeployIdentityRegistry.s.sol --rpc-url arc_testnet --broadcast
contract DeployIdentityRegistry is Script {
    function run() external returns (IdentityRegistry registry) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("IDENTITY_OWNER");
        address attester = vm.envAddress("IDENTITY_ATTESTER");

        vm.startBroadcast(deployerKey);
        registry = new IdentityRegistry(owner, attester);
        vm.stopBroadcast();

        console.log("IdentityRegistry:", address(registry));
    }
}
