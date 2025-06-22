import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [
      "b46a-41-60-239-118.ngrok-free.app",
      "d623-196-216-85-149.ngrok-free.app",
      // Allow all ngrok domains
      /^.*\.ngrok-free\.app$/,
      /^.*\.ngrok\.io$/
    ],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})