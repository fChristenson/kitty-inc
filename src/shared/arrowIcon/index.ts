// the stroked "arrow-up" icon, as raw DOM markup — background/cityMap's own
// prev/next/pointer
// arrows and hud/corporationBoostMenu's crit-list chevron both request this at
// their own size rather than each hand-rolling the same path data. Rotated to
// point whichever direction via CSS on the caller's own wrapper, same as
// cityMap already did before this was extracted
export function arrowIconMarkup(size: number): string {
  return `
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="black" stroke-width="9">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
      </g>
      <g stroke="currentColor" stroke-width="5">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
      </g>
    </svg>
  `;
}
