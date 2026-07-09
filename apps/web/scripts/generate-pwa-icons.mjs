#!/usr/bin/env node
// Rasterises the torii mark (public/torii-icon.svg's geometry) into the PWA
// icon set (ARCHITECTURE.md §14e). Run manually, only when the mark changes:
//   npm run generate-pwa-icons
// Dev-only (sharp is a devDependency, ARCHITECTURE.md §3) — never imported by
// app code, never shipped.
//
// Hex exception: favicons/manifests/icon-generation scripts can't read CSS
// custom properties, so these two constants are hardcoded — the documented
// exception in DESIGN.md §12a (which extends the original favicon exception,
// DESIGN.md §8). Values must match theme.css's light `clay`/`paper` exactly;
// update here + torii-icon.svg + vite.config.ts's manifest together if the
// palette ever changes.
const CLAY = '#c33c54'
const PAPER = '#f7fbfa'

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')

// The torii glyph's five rects, in the SAME 32x32 coordinate space as
// public/torii-icon.svg — kept identical so every icon is provably the same
// mark, just framed differently.
const TORII_RECTS = [
  { x: 4.5, y: 4.5, w: 23, h: 2.4, rx: 1.2 },
  { x: 2.8, y: 7.4, w: 26.4, h: 3, rx: 1.5 },
  { x: 6.5, y: 12.6, w: 19, h: 2.6, rx: 1 },
  { x: 8.6, y: 7.4, w: 3.1, h: 19, rx: 0.6 },
  { x: 20.3, y: 7.4, w: 3.1, h: 19, rx: 0.6 },
]
// Bounding box of the glyph above, in the same 32-unit space.
const BBOX = { minX: 2.8, maxX: 29.2, minY: 4.5, maxY: 26.4 }
const BBOX_W = BBOX.maxX - BBOX.minX
const BBOX_CX = (BBOX.minX + BBOX.maxX) / 2
const BBOX_CY = (BBOX.minY + BBOX.maxY) / 2

function toriiGroup(transform) {
  const rects = TORII_RECTS.map(
    (r) =>
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx}" />`,
  ).join('')
  return `<g fill="${CLAY}" transform="${transform}">${rects}</g>`
}

/**
 * @param size {number} canvas size in px (square)
 * @param opts.roundedGround {boolean} true = favicon-style rounded-rect ground
 *   (rx scaled from the original 6/32 ratio); false = full-bleed square
 *   (maskable / apple-touch-icon — the OS applies its own mask)
 * @param opts.widthFraction {number|null} desired torii bbox width as a
 *   fraction of `size`; null = "the SVG's own proportions" (direct 1:1 scale
 *   of the 32x32 viewBox, i.e. the same layout as the favicon, just bigger)
 */
function buildSvg(size, { roundedGround, widthFraction }) {
  const groundRx = roundedGround ? (6 / 32) * size : 0
  const ground = `<rect width="${size}" height="${size}" rx="${groundRx}" fill="${PAPER}" />`

  let transform
  if (widthFraction == null) {
    // Direct scale-up of the original 32x32 canvas — "the SVG's own
    // proportions" (pwa-192 / pwa-512).
    const k = size / 32
    transform = `scale(${k})`
  } else {
    // Scale so the torii's bounding-box width is `widthFraction` of the
    // canvas, then centre that bounding box on the canvas (maskable /
    // apple-touch-icon).
    const k = (widthFraction * size) / BBOX_W
    const tx = size / 2 - BBOX_CX * k
    const ty = size / 2 - BBOX_CY * k
    transform = `translate(${tx} ${ty}) scale(${k})`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${toriiGroup(transform)}</svg>`
}

async function render(svg, filename, size, { opaque = false } = {}) {
  const buf = Buffer.from(svg)
  let pipeline = sharp(buf, { density: 384 }).resize(size, size)
  // apple-touch-icon must be opaque with no alpha channel at all — iOS is
  // picky about this (ARCHITECTURE.md §14e). The background rect already
  // covers 100% of the canvas, so flattening only strips the (unused) alpha
  // channel, it doesn't change a single visible pixel.
  if (opaque) pipeline = pipeline.flatten({ background: PAPER })
  await pipeline.png().toFile(join(outDir, filename))
  console.log(`wrote ${filename} (${size}x${size}, opaque=${opaque})`)
}

async function main() {
  await mkdir(outDir, { recursive: true })

  // pwa-192 / pwa-512: rounded-rect ground (the favicon's own), torii at the
  // SVG's natural proportions — the home-screen icon is the favicon, grown up.
  await render(buildSvg(192, { roundedGround: true, widthFraction: null }), 'pwa-192.png', 192)
  await render(buildSvg(512, { roundedGround: true, widthFraction: null }), 'pwa-512.png', 512)

  // maskable-512: full-bleed square, torii at ~60% width, centred — inside
  // the maskable spec's central 80% safe zone.
  await render(
    buildSvg(512, { roundedGround: false, widthFraction: 0.6 }),
    'pwa-maskable-512.png',
    512,
  )

  // apple-touch-icon: full-bleed square, opaque, no rounded corners (iOS
  // applies its own mask), torii at ~70%.
  await render(
    buildSvg(180, { roundedGround: false, widthFraction: 0.7 }),
    'apple-touch-icon.png',
    180,
    { opaque: true },
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
