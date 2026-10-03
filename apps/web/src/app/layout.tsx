import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ToastProvider } from "@/components/Toast";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

/**
 * One family carries the whole interface. Archivo's width axis gives an
 * expanded display voice and a normal-width UI voice out of a single download,
 * which matters on a metered connection.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

/** Mono is for section labels, timestamps and addresses. Never for body copy. */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrackPay",
  description: "Send dollars like a text.",
  applicationName: "CrackPay",
  appleWebApp: { capable: true, title: "CrackPay", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Installed, the app draws under the notch and the home indicator; every
  // screen pads itself back out with the safe-area insets.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // The status bar should match the paper behind it, in either scheme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <WalletProvider>{children}</WalletProvider>
        </ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
