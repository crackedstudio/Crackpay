import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Reachable from a phone on the same network.
    host: true,
    // Lets a tunnel (ngrok, Cloudflare) reach the dev server, so the app can be
    // loaded in CrackPay's Developer mode.
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"],
  },
});
