import type { CritMeta } from "../../../critKit/meta";

// drops of light drizzle onto every readout, quickening to a downpour, each
// ringing out flat along its bar; then one huge drop plunges onto its own:
// the bar's payouts echo back twice, fainter each time
export default {
  label: "Echo Chamber",
  chance: 0.03,
  style: "ripple",
  // each of the next `payouts` payouts (`ownPayouts` on its own bar) pays
  // again `echoMs` later at `echo` of it, and again `echoMs` after that at
  // `echo` squared
  values: { payouts: 5, ownPayouts: 10, echo: 0.5, echoMs: 350 },
  isNew: true,
} satisfies CritMeta;
