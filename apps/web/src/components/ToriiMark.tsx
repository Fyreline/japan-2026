/** The site mark — a flat two-post torii silhouette in `currentColor`
 * (renders clay in the header/login, follows theme). Drawn with the same
 * weight as Mishka's cat mark. No hex here — colour comes from the parent's
 * text colour. The flat favicon export lives at public/torii-icon.svg
 * (DESIGN.md §8). Pass width/height (px) — a nested SVG can otherwise ignore
 * CSS class sizing. */
export function ToriiMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      fill="currentColor"
    >
      <rect x="4.5" y="4.5" width="23" height="2.4" rx="1.2" />
      <rect x="2.8" y="7.4" width="26.4" height="3" rx="1.5" />
      <rect x="6.5" y="12.6" width="19" height="2.6" rx="1" />
      <rect x="8.6" y="7.4" width="3.1" height="19" rx="0.6" />
      <rect x="20.3" y="7.4" width="3.1" height="19" rx="0.6" />
    </svg>
  )
}
