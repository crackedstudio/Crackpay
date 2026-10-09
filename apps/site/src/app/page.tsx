import { Label, Mark, Wordmark, buttonClass } from "@crackpay/brand";
import type { Size, Variant } from "@crackpay/brand";
import {
  ArrowDown,
  ArrowUp,
  Face,
  Grid,
  Link as LinkIcon,
  Plus,
  Receipt,
  Shield,
} from "@crackpay/brand/icons";
import type { ReactNode } from "react";
import { APP, DOCS, RETURNING } from "@/config/app";

/*
 * The marketing page is the one screen in CrackPay that is read on a laptop, so
 * it is the one place the 460px app column does not apply. It still obeys every
 * other rule: paper and ink, hard rules dividing the page, hard shadows, and
 * green only on the button that says go.
 */
const SHELL = "mx-auto w-full max-w-[72rem] px-5 sm:px-8";

/** Every link out of this page crosses into the app's own origin, so it is a
 *  plain anchor wearing the shared button's clothes rather than a router link. */
function CtaLink({
  href,
  variant = "primary",
  size = "lg",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={buttonClass(variant, size, className)}>
      {children}
    </a>
  );
}

/** The three promises, in the order a first-time visitor cares about them.
 *  Lifted verbatim from the app's welcome screen — they are the product promise. */
const promises = [
  "Payments land in a second, and sending is free.",
  "Your face or fingerprint approves every payment.",
  "No seed phrase to write down or lose.",
] as const;

const steps = [
  {
    title: "Pick your handle",
    body: "Verify your number once and choose an @handle. That is the whole of what someone needs to pay you.",
  },
  {
    title: "Get your first dollars",
    body: "Someone pays you, you claim a KashLink you were sent, or you move dollars in from another app.",
  },
  {
    title: "Pay anyone",
    body: "Type an amount, approve it with your face or fingerprint, and it lands. There is no counter to watch.",
  },
] as const;

const features = [
  {
    Icon: ArrowUp,
    title: "Send to a handle",
    body: "Type @sam and an amount. Nothing long to copy, nothing to paste wrong.",
  },
  {
    Icon: ArrowDown,
    title: "Get paid",
    body: "Share a QR code, your handle, or a payment link. Money arrives whether or not the app is open.",
  },
  {
    Icon: LinkIcon,
    title: "Send as a link",
    body: "KashLink hands money to someone who is not on CrackPay yet. Opening the link sets up their account.",
  },
  {
    Icon: Receipt,
    title: "A receipt for each one",
    body: "Every payment in and out, grouped by day, with a receipt you can open months later.",
  },
  {
    Icon: Grid,
    title: "Mini Apps",
    body: "Small apps that run inside CrackPay and use your account, with the amount always shown before you approve.",
  },
  {
    Icon: Plus,
    title: "Add it to your home screen",
    body: "It installs from the browser, opens like any other app, and keeps working on a weak connection.",
  },
] as const;

/** The money facts, set as a table because they are facts being checked. */
const facts = [
  { label: "Sending", value: "Free" },
  { label: "Receiving", value: "Free" },
  { label: "Keeping an account open", value: "Free" },
  { label: "Time to land", value: "~1 sec" },
] as const;

const safety = [
  {
    Icon: Face,
    title: "Your face, finger or PIN",
    body: "The same unlock you already use on your phone approves each payment. There is no password to pick, forget or have stolen.",
  },
  {
    Icon: Shield,
    title: "Nothing to write down",
    body: "No seed phrase exists in CrackPay — not in setup, not in recovery. Nothing to screenshot and nothing to lose in a drawer.",
  },
  {
    Icon: Mark,
    title: "We cannot touch your money",
    body: "You hold your own account. CrackPay has no way to move your dollars, freeze them, or lose them on your behalf.",
  },
] as const;

/** The app as it actually looks, drawn in the same tokens rather than shipped as
 *  a screenshot — a picture would cost a phone user more than the page. */
function PhoneMock() {
  const fakeButton = "flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-ink font-bold";
  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        The CrackPay home screen, showing a balance of $1,240.00 for the handle @sadiq, buttons to deposit and
        withdraw, and two recent payments.
      </figcaption>
      <div
        aria-hidden
        className="mx-auto w-full max-w-[20.5rem] rounded-[1.75rem] border-[1.5px] border-ink bg-card p-4.5 shadow-slab-lg sm:-rotate-[1.5deg]"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface text-[0.6875rem] font-bold">
              SA
            </span>
            <span className="font-semibold">@sadiq</span>
          </span>
          <Mark className="h-5 w-[1.2rem] text-muted" />
        </div>

        <div className="mt-6 flex flex-col gap-1.5 border-b-[1.5px] border-ink">
          <Label>Your balance</Label>
          <span className="figure pb-4 text-[2.875rem]">$1,240.00</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <span className={`${fakeButton} bg-go text-go-ink`}>
            <ArrowDown className="h-5 w-5" strokeWidth={2.25} />
            Deposit
          </span>
          <span className={`${fakeButton} bg-card text-ink`}>
            <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
            Withdraw
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <span className="label text-ink">Recent</span>
          <div className="flex items-center justify-between border-t border-hair py-2.5">
            <span className="text-[0.9375rem] font-semibold">From @ada</span>
            <span className="numeric font-bold text-money">+$40.00</span>
          </div>
          <div className="flex items-center justify-between border-t border-hair py-2.5">
            <span className="text-[0.9375rem] font-semibold">To @sam</span>
            <span className="numeric font-bold">−$12.40</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

/** A section's name, set as a mono label over an ink rule — the page is divided
 *  by rules, not by cards. The app's `SectionHeading` is tuned to a 460px
 *  column, so the site sets the same style at its own width. */
function Rule({ children }: { children: ReactNode }) {
  return <h2 className="label flex items-baseline border-b-[1.5px] border-ink pb-2 text-muted">{children}</h2>;
}

export default function Landing() {
  return (
    <div className="flex min-h-full flex-col">
      <header className={`${SHELL} flex items-center justify-between gap-4 py-5`}>
        <Wordmark />
        <nav className="flex items-center gap-5">
          <a href={DOCS.home} className="hidden text-sm font-medium text-muted sm:block">
            Docs
          </a>
          <a href={APP.developers} className="hidden text-sm font-medium text-muted sm:block">
            Build Mini Apps
          </a>
          <a
            href={APP.home}
            className="pressable hard flex h-11 items-center rounded-md border-[1.5px] border-ink bg-card px-5 text-sm font-semibold"
          >
            Open CrackPay
          </a>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* ---------------------------------------------------------- hero */}
        <section
          className={`${SHELL} grid animate-rise gap-12 pt-6 pb-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pt-12 lg:pb-24`}
        >
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-5">
              <h1 className="display text-[2.75rem] leading-[0.95] text-balance sm:text-[4rem] lg:text-[4.5rem]">
                Send dollars like a text.
              </h1>
              <p className="max-w-[34rem] text-lg leading-[1.45] text-muted sm:text-xl">
                A dollar account that lives on your phone. You hold the money yourself — there is no bank in the
                middle and no company that can freeze you.
              </p>
            </div>

            <ol className="max-w-[34rem] border-t-[1.5px] border-ink">
              {promises.map((text, index) => (
                <li
                  key={text}
                  className={`flex items-baseline gap-4 py-3.5 ${
                    index === promises.length - 1 ? "border-b-[1.5px] border-ink" : "border-b border-hair"
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{`0${index + 1}`}</span>
                  <span className="text-[0.9375rem] leading-[1.45] sm:text-base">{text}</span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-56">
                <CtaLink href={APP.onboarding}>Get started</CtaLink>
              </div>
              <div className="w-full sm:w-auto">
                <CtaLink href={RETURNING} variant="ghost" className="h-12 sm:px-2">
                  I already have an account
                </CtaLink>
              </div>
            </div>
            <p className="text-sm text-muted">
              Works in your phone&apos;s browser. Nothing to download, and no card or bank account to connect.
            </p>
          </div>

          <PhoneMock />
        </section>

        {/* -------------------------------------------------- how it works */}
        <section className={`${SHELL} flex flex-col gap-8 pb-16 lg:pb-24`}>
          <Rule>Getting started</Rule>
          <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-ink bg-card font-mono text-sm font-semibold">
                  {`0${index + 1}`}
                </span>
                <h3 className="display text-2xl">{step.title}</h3>
                <p className="leading-[1.5] text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="max-w-[40rem] text-sm text-muted">
            Two people who have never used CrackPay can set up and pay each other in under a minute, on a phone
            browser. That is the bar the whole product is built to.
          </p>
        </section>

        {/* ------------------------------------------------------ features */}
        <section className={`${SHELL} flex flex-col gap-8 pb-16 lg:pb-24`}>
          <Rule>What you can do</Rule>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3 rounded-lg border-[1.5px] border-ink bg-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-md border-[1.5px] border-ink bg-surface">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-[1.0625rem] font-bold">{title}</h3>
                <p className="text-sm leading-[1.5] text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- money facts */}
        <section className={`${SHELL} flex flex-col gap-8 pb-16 lg:pb-24`}>
          <Rule>What it costs</Rule>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
            <div className="flex flex-col gap-4">
              <h3 className="display text-[2rem] leading-[1.02] text-balance sm:text-[2.5rem]">
                Nothing comes off the amount you send.
              </h3>
              <p className="leading-[1.5] text-muted">
                The person you pay receives the figure you typed. CrackPay covers the network fee on every payment,
                so there is no fee line to read and no second balance to keep topped up for one.
              </p>
            </div>
            <dl className="rounded-lg border-[1.5px] border-ink bg-card">
              {facts.map(({ label, value }, index) => (
                <div
                  key={label}
                  className={`flex items-baseline justify-between gap-4 px-5 py-4 ${
                    index === 0 ? "" : "border-t border-hair"
                  }`}
                >
                  <dt className="text-[0.9375rem] text-muted">{label}</dt>
                  <dd className="numeric text-xl font-bold text-money">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------- safety */}
        <section className={`${SHELL} flex flex-col gap-8 pb-16 lg:pb-24`}>
          <Rule>Who can move it</Rule>
          <div className="flex flex-col gap-4">
            <h3 className="display max-w-[30rem] text-[2rem] leading-[1.02] text-balance sm:text-[2.5rem]">
              Only you. That is the whole design.
            </h3>
            <div className="grid gap-8 pt-2 sm:grid-cols-3 sm:gap-7">
              {safety.map(({ Icon, title, body }) => (
                <div key={title} className="flex flex-col gap-2.5 border-t-[1.5px] border-ink pt-4">
                  <Icon className="h-6 w-6" />
                  <h4 className="text-[1.0625rem] font-bold">{title}</h4>
                  <p className="text-sm leading-[1.5] text-muted">{body}</p>
                </div>
              ))}
            </div>
            <p className="max-w-[40rem] pt-2 text-sm text-muted">
              Set up recovery when you open your account and it comes back on a new phone with your number and your
              face. Signing out only removes the account from that browser — your money stays where it is.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------- developers */}
        <section className={`${SHELL} pb-16 lg:pb-24`}>
          <div className="flex flex-col gap-6 rounded-lg border-[1.5px] border-ink bg-surface p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex max-w-[34rem] flex-col gap-3">
              <Label>For developers</Label>
              <h2 className="display text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">
                Put your app in front of a dollar account.
              </h2>
              <p className="leading-[1.5] text-muted">
                A Mini App is a web app that runs inside CrackPay and pays with the user&apos;s own account. Install
                the SDK and your app is connected the moment it loads — on Arc, with fees sponsored.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-72">
              <pre className="overflow-x-auto rounded-md border-[1.5px] border-ink bg-card p-4 font-mono text-xs">
                npm install @crackpay/miniapp-sdk
              </pre>
              <CtaLink href={DOCS.home} variant="secondary" size="md">
                Read the docs
              </CtaLink>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-medium">
                <a href={DOCS.quickStart} className="text-muted">
                  Quick start
                </a>
                <a href={DOCS.skills} className="text-muted">
                  AI skills
                </a>
                <a href={DOCS.submit} className="text-muted">
                  Get listed
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ final CTA */}
        <section className={`${SHELL} flex flex-col items-start gap-7 border-t-[1.5px] border-ink py-16 lg:py-24`}>
          <h2 className="display max-w-[36rem] text-[2.5rem] leading-[0.95] text-balance sm:text-[3.5rem]">
            Open an account in under a minute.
          </h2>
          <p className="max-w-[34rem] text-lg leading-[1.45] text-muted">
            Your number, your handle, and the unlock you already use. There is nothing else to set up.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <CtaLink href={APP.onboarding}>Get started</CtaLink>
            </div>
            <div className="w-full sm:w-auto">
              <CtaLink href={RETURNING} variant="ghost" className="h-12 sm:px-2">
                I already have an account
              </CtaLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-[1.5px] border-ink">
        <div className={`${SHELL} flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between`}>
          <div className="flex flex-col gap-3">
            <Wordmark />
            <p className="max-w-[26rem] text-sm leading-[1.5] text-muted">
              A self-custodial dollar account. You hold your own money, and CrackPay cannot move it for you.
            </p>
          </div>
          <nav className="flex flex-col gap-2.5 text-sm font-medium sm:items-end">
            <a href={APP.home} className="text-muted">
              Open CrackPay
            </a>
            <a href={APP.developers} className="text-muted">
              Build Mini Apps
            </a>
            <a href={DOCS.home} className="text-muted">
              Developer docs
            </a>
            <a href="https://github.com/crackedstudio/crackpay-skills" className="text-muted">
              CrackPay skills
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
