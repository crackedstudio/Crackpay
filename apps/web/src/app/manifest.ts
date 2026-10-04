import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrackPay",
    short_name: "CrackPay",
    description: "Send dollars like a text.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The splash is ink with the mark on it; the app itself opens on paper.
    background_color: "#12100e",
    theme_color: "#f3f1ec",
    // Long-press the installed icon to go straight to the two things people do.
    shortcuts: [
      { name: "Deposit", short_name: "Deposit", url: "/add-money" },
      { name: "Withdraw", short_name: "Withdraw", url: "/send" },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Full-bleed, with the mark inside the safe zone, so Android's mask
      // cannot clip the crack off.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
