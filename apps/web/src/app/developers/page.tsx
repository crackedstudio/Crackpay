import type { Metadata } from "next";
import { LinkButton, Screen } from "@/components/ui";

export const metadata: Metadata = {
  title: "Build Mini Apps · CrackPay",
  description: "Developer documentation for building Mini Apps that run inside CrackPay on Arc.",
};

const sections = [
  {
    title: "Getting started",
    pages: [
      { file: "overview.md", name: "Overview", about: "What a Mini App is and how it talks to the wallet." },
      { file: "quick-start.md", name: "Quick start", about: "Add the SDK, connect, read a balance, send a payment." },
      { file: "test-in-crackpay.md", name: "Test in CrackPay", about: "Developer mode and loading a test page." },
    ],
  },
  {
    title: "Guides",
    pages: [
      { file: "wallet-connection.md", name: "Wallet connection", about: "The provider, auto-connect and wagmi." },
      { file: "transactions.md", name: "Transactions and balances", about: "USDC decimals on Arc, sending, errors." },
      { file: "ui-and-container.md", name: "UI and container", about: "Frame size, sandbox, storage, navigation." },
      { file: "listing.md", name: "Get listed", about: "What CrackPay needs to approve and list your app." },
    ],
  },
  {
    title: "Reference",
    pages: [
      { file: "reference.md", name: "Reference", about: "Supported methods, events, error codes, limits." },
      { file: "SKILL.md", name: "SKILL.md", about: "The whole guide in one file, for AI coding assistants." },
      {
        file: "https://github.com/crackedstudio/crackpay-skills",
        name: "CrackPay skills",
        about: "Installable skills for Claude Code, Cursor, Codex and others: npx skills add crackedstudio/crackpay-skills",
      },
      { file: "llms.txt", name: "llms.txt", about: "Index of these pages for tools." },
    ],
  },
];

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
      <LinkButton href="/developers/submit">Submit a Mini App</LinkButton>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h2 className="font-semibold">{section.title}</h2>
          <div className="flex flex-col divide-y divide-hair rounded-md border border-hair bg-card px-4">
            {section.pages.map((page) => (
              <a key={page.file} href={page.file.startsWith("https://") ? page.file : `/developers/${page.file}`} className="flex flex-col py-3">
                <span className="font-medium">{page.name}</span>
                <span className="text-sm text-muted">{page.about}</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </Screen>
  );
}
