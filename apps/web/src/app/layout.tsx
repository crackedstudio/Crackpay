import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ToastProvider } from "@/components/Toast";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
  // The status bar should match the screen behind it, in either scheme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
