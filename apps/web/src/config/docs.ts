/**
 * The developer documentation is a separate deployment on its own domain, so
 * links into it are absolute and open in a new tab — the wallet is installed as
 * a PWA and navigating the shell away from itself loses the user's place.
 *
 * Mirrors `apps/site/src/config/app.ts`. Paths were checked against the live
 * site on 2026-10-09; its `llms.txt` is the index they came from. Only paths
 * used by the app live here, so a dead link shows up in one file.
 */
const base = (process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.crackpay.xyz").replace(/\/$/, "");

export const DOCS = {
  home: base,
  /* Getting started */
  quickStart: `${base}/getting-started/quick-start`,
  testInCrackPay: `${base}/getting-started/test-in-crackpay`,
  faq: `${base}/faq`,
  /* Build with AI */
  skills: `${base}/ai/skills`,
  singleFileSkill: `${base}/ai/single-file-skill`,
  /* Guides */
  walletConnection: `${base}/guides/wallet-connection`,
  uiAndContainer: `${base}/guides/ui-and-container`,
  smartContracts: `${base}/guides/smart-contracts`,
  existingDapp: `${base}/guides/existing-dapp`,
  deployment: `${base}/guides/deployment`,
  submit: `${base}/guides/submit-your-miniapp`,
  /* Reference */
  sdk: `${base}/reference/sdk`,
  providerMethods: `${base}/reference/provider-methods`,
  errors: `${base}/reference/errors`,
  arcNetwork: `${base}/reference/arc-network`,
  examples: `${base}/examples`,
} as const;

/** What the docs link reads as in prose, without the scheme. */
export const DOCS_HOST = base.replace(/^https?:\/\//, "");
