import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// For GitHub Pages *project* sites the app is served from /<repo>/, so
// .github/workflows/deploy-pages.yml sets VITE_BASE=/japan-2026/ at build
// time. Defaults to '/' for local dev. Japan takes port 5175 — Mishka owns
// 5173, Michi 5174 (ARCHITECTURE.md §3).
const base = process.env.VITE_BASE ?? '/'

// Hex exception (DESIGN.md §12a, extends §8's favicon exception): a manifest
// can't read CSS custom properties. Values must match theme.css's light
// `clay`/`paper` exactly — keep in step with public/torii-icon.svg and
// scripts/generate-pwa-icons.mjs if the palette ever changes.
const PAPER = '#f7fbfa'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Deliberate, not autoUpdate (ARCHITECTURE.md §14d) — this app is
      // edited live mid-trip; a SW swap underneath a session is exactly the
      // wrong moment. UpdateToast drives the refresh, only on tap.
      registerType: 'prompt',
      includeAssets: ['torii-icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Japan 2026',
        short_name: 'Japan 2026',
        description: 'Two of you, two weeks, one plan.',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: PAPER,
        background_color: PAPER,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // Tokens are never cache material.
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
            handler: 'NetworkOnly',
          },
          {
            // Freshness matters when online; availability wins when not —
            // the last-loaded slots/spots/marks/packing/journal rows render
            // on the Shinkansen. NOT CacheFirst: a stale itinerary shown
            // while online would fight the realtime channel.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Signed URLs differ only by token query — ignoreSearch makes
            // the object path the cache key, so last-viewed journal photos
            // work offline; the bytes at a path rarely change.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/,
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'journal-photos',
              matchOptions: { ignoreSearch: true },
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Last-viewed map areas survive offline; 200 tiles ≈ a few MB.
            urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/,
            handler: 'CacheFirst',
            method: 'GET',
            options: {
              cacheName: 'carto-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // api.open-meteo.com deliberately NOT listed — the app-level cache
          // (DATA_MODEL.md §13c) already owns weather staleness; two cache
          // layers would fight (ARCHITECTURE.md §14f).
        ],
      },
      // SW off in dev — dev stays simple, no background-sync/mutation
      // queue anywhere (ARCHITECTURE.md §4's non-goal 5 stands).
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5175 },
})
