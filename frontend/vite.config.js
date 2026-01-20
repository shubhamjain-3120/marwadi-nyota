import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["fonts/**/*", "assets/**/*"],
      manifest: {
        name: "Wedding Invite Generator",
        short_name: "WedInvite",
        description: "Generate beautiful Marwadi wedding invitations",
        theme_color: "#8B0000",
        background_color: "#FFF8DC",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
