// Regenerates public/miniapp-sdk.js from src/lib/miniapp/sdk.ts.
//
//   pnpm build:sdk
import { readFileSync, writeFileSync } from "node:fs";
import { buildSdkScript } from "../src/lib/miniapp/build-sdk.ts";

const output = buildSdkScript(readFileSync("src/lib/miniapp/sdk.ts", "utf8"));
writeFileSync("public/miniapp-sdk.js", output);
console.log(`public/miniapp-sdk.js written (${output.length} bytes)`);
