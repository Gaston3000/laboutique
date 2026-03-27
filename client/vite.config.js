import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      // SEO files served by Express so bots always get fresh data
      "/sitemap.xml": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/robots.txt": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/prerender": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/googlee7e466e36a84516f.html": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    },
    allowedHosts: [
      'unopted-jaylah-lovely.ngrok-free.dev'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
