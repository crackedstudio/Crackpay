// Syncs the Mini App SDK from its source of truth, the npm package:
//   packages/miniapp-sdk/src/provider.ts
//     → src/lib/miniapp/sdk.ts   (what the CrackPay host imports)
//     → public/miniapp-sdk.js    (the hosted script)
//
//   pnpm build:sdk
import { readFileSync, writeFileSync } from "node:fs";
import { buildSdkScript } from "../src/lib/miniapp/build-sdk.ts";

const source = readFileSync("../../packages/miniapp-sdk/src/provider.ts", "utf8");
writeFileSync("src/lib/miniapp/sdk.ts", source);

const output = buildSdkScript(source);
writeFileSync("public/miniapp-sdk.js", output);
console.log(`src/lib/miniapp/sdk.ts synced; public/miniapp-sdk.js written (${output.length} bytes)`);
