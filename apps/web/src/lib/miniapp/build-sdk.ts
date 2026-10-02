import ts from "typescript";

/**
 * Turns sdk.ts into the standalone script served at /miniapp-sdk.js, so a Mini
 * App can use CrackPay with one <script> tag and no build step.
 *
 * The script trusts only the CrackPay origin it was loaded from, unless the tag
 * carries data-host-origins="https://a,https://b".
 */
export function buildSdkScript(source: string): string {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, removeComments: true },
  });

  return `/* CrackPay Mini App SDK. Generated from src/lib/miniapp/sdk.ts by "pnpm build:sdk". Do not edit. */
(function () {
  var script = document.currentScript;
  var exports = {};
${outputText
  .split("\n")
  .map((line) => (line ? `  ${line}` : line))
  .join("\n")}
  var configured = script && script.getAttribute("data-host-origins");
  var origins = configured
    ? configured.split(",").map(function (origin) { return origin.trim(); }).filter(Boolean)
    : script && script.src
      ? [new URL(script.src).origin]
      : [];
  window.crackpay = {
    version: exports.PROTOCOL_VERSION,
    /** Resolves with the EIP-1193 provider inside CrackPay, or null in an ordinary tab. */
    ready: exports.installCrackPayProvider({ hostOrigins: origins }),
  };
})();
`;
}
