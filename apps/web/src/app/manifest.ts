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
    background_color: "#f7f7f5",
    theme_color: "#f7f7f5",
    // Long-press the installed icon to go straight to the two things people do.
    shortcuts: [
      { name: "Send money", short_name: "Send", url: "/send" },
      { name: "Receive money", short_name: "Receive", url: "/receive" },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
