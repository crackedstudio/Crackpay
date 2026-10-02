// Prints a VAPID key pair for apps/web/.env.local.
//
//   node --experimental-strip-types scripts/generate-vapid-keys.ts
import { createECDH } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();

console.log(`VAPID_PUBLIC_KEY=${ecdh.getPublicKey().toString("base64url")}`);
// The scalar can come back shorter than 32 bytes when it has leading zeros.
const privateKey = Buffer.concat([Buffer.alloc(32), ecdh.getPrivateKey()]).subarray(-32);
console.log(`VAPID_PRIVATE_KEY=${privateKey.toString("base64url")}`);
