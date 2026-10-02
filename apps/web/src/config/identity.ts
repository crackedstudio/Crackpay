import { parseAbi } from "viem";

export const identityRegistryAbi = parseAbi([
  "function register(bytes32 phoneHash, string handle, uint256 deadline, bytes signature)",
  "function resolvePhone(bytes32 phoneHash) view returns (address)",
  "function resolveHandle(string handle) view returns (address)",
  "function reverse(address account) view returns (string)",
  "function phoneHashOf(address account) view returns (bytes32)",
  "error AttestationExpired()",
  "error InvalidAttestation()",
  "error InvalidHandle()",
  "error AlreadyRegistered()",
  "error PhoneTaken()",
  "error HandleTaken()",
]);

// Must match the EIP712 constructor arguments and REGISTRATION_TYPEHASH in
// IdentityRegistry.sol. The contract's tests pin the resulting digest.
export const IDENTITY_DOMAIN_NAME = "CrackPay IdentityRegistry";
export const IDENTITY_DOMAIN_VERSION = "1";

export const registrationTypes = {
  Registration: [
    { name: "account", type: "address" },
    { name: "phoneHash", type: "bytes32" },
    { name: "handle", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
