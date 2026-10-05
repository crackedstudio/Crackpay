import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SITE_URL } from "@/config/app";
import "./globals.css";

/**
 * The same single family as the app. Archivo's width axis gives the expanded
 * display voice and the normal-width UI voice out of one download, which
 * matters as much on the page that loads first as it does inside the product.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

/** Mono is for section labels and figures. Never for body copy. */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const description =
  "A self-custodial dollar account that lives on your phone. Payments land in a second, sending is free, and your face or fingerprint approves every one.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CrackPay — Send dollars like a text",
  description,
  applicationName: "CrackPay",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CrackPay",
    title: "CrackPay — Send dollars like a text",
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "CrackPay — Send dollars like a text", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
};

/**
 * The marketing site carries none of the app's shell: no wallet provider, no
 * toasts, no service worker, no PWA manifest. It is a page to read.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
