import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// For GitHub Pages *project* sites the app is served from /<repo>/, so
// .github/workflows/deploy-pages.yml sets VITE_BASE=/japan-2026/ at build
// time. Defaults to '/' for local dev. Japan takes port 5175 — Mishka owns
// 5173, Michi 5174 (ARCHITECTURE.md §3).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5175 },
})
