import type { Metadata } from "next";
import { External } from "@/components/icons";
import { LinkButton, Screen, buttonClass } from "@/components/ui";
import { DOCS, DOCS_HOST } from "@/config/docs";

export const metadata: Metadata = {
  title: "Build Mini Apps · CrackPay",
  description: "Developer documentation for building Mini Apps that run inside CrackPay on Arc.",
};

/**
 * The documentation itself lives at docs.crackpay.xyz; this screen is the door
 * to it from inside the wallet, plus the one thing only the wallet can do —
 * take a listing submission. Every row leaves for the docs in a new tab, so an
 * installed PWA keeps its place.
 *
 * The single-file `SKILL.md` has a row of its own because an agent reading over
 * a developer's shoulder is as much a reader of this screen as a person is.
 */
const sections = [
  {
    title: "Getting started",
    pages: [
      { href: DOCS.home, name: "What are Mini Apps?", about: "How a Mini App runs inside CrackPay and talks to the wallet." },
      { href: DOCS.quickStart, name: "Quick start", about: "Scaffold an app, connect, read a balance, send a payment." },
      { href: DOCS.testInCrackPay, name: "Test in CrackPay", about: "Developer mode, a test URL, tunnels, debugging." },
      { href: DOCS.faq, name: "FAQ", about: "The questions that come up first." },
    ],
  },
  {
    title: "Build with AI",
    pages: [
      { href: DOCS.skills, name: "CrackPay skills", about: "Skills for Claude Code, Cursor, Codex and others." },
      { href: DOCS.singleFileSkill, name: "Single-file SKILL.md", about: "The whole guide in one file, for coding agents." },
      {
        href: "https://github.com/crackedstudio/crackpay-skills",
        name: "Skills on GitHub",
        about: "npx skills add crackedstudio/crackpay-skills",
      },
    ],
  },
  {
    title: "Guides",
    pages: [
      { href: DOCS.walletConnection, name: "Wallet connection", about: "The provider, auto-connect, viem, React and wagmi." },
      { href: DOCS.uiAndContainer, name: "UI and container", about: "Frame size, sandbox, storage, navigation." },
      { href: DOCS.smartContracts, name: "Smart contracts", about: "Calling your own contracts from a smart account." },
      { href: DOCS.existingDapp, name: "Bringing an existing dApp", about: "What to change in an app you already have." },
      { href: DOCS.deployment, name: "Deployment", about: "HTTPS, and letting CrackPay frame your app." },
      { href: DOCS.submit, name: "Get listed", about: "The listing file, the requirements, the review." },
    ],
  },
  {
    title: "Reference",
    pages: [
      { href: DOCS.sdk, name: "SDK reference", about: "Every export of @crackpay/miniapp-sdk." },
      { href: DOCS.providerMethods, name: "Provider methods", about: "What the wallet answers, and what it refuses." },
      { href: DOCS.errors, name: "Error codes", about: "What each rejection means and what to do about it." },
      { href: DOCS.arcNetwork, name: "Arc network", about: "Chain, tokens, and USDC's two decimal scales." },
      { href: DOCS.examples, name: "Examples", about: "Working apps to read and copy." },
    ],
  },
] as const;

export default function Developers() {
  return (
    <Screen title="Build Mini Apps" back="/">
      <p className="text-muted">
        A Mini App is a web app that runs inside CrackPay and uses the CrackPay user&apos;s wallet. Install the SDK, and
        your app is connected the moment it loads.
      </p>
      <pre className="overflow-x-auto rounded-md border border-hair bg-card p-4 text-xs">
        npm install @crackpay/miniapp-sdk
      </pre>
      <a href={DOCS.home} target="_blank" rel="noreferrer" className={buttonClass("primary", "lg")}>
        Read the docs
        <External className="h-4 w-4" />
      </a>
      <LinkButton href="/developers/submit" variant="secondary">
        Submit a Mini App
      </LinkButton>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h2 className="font-semibold">{section.title}</h2>
          <div className="flex flex-col divide-y divide-hair rounded-md border border-hair bg-card px-4">
            {section.pages.map((page) => (
              <a key={page.href} href={page.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3">
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">{page.name}</span>
                  <span className="text-sm text-muted">{page.about}</span>
                </span>
                <External className="h-4 w-4 shrink-0 text-muted" />
              </a>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm text-muted">
        The documentation lives at{" "}
        <a href={DOCS.home} target="_blank" rel="noreferrer" className="font-medium text-ink underline">
          {DOCS_HOST}
        </a>
        .
      </p>
    </Screen>
  );
}
