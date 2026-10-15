import type { CritMeta } from "../../../critKit/meta";

// magic circles under every readout joined by lines of light, erupting one
// after another down the chain: every bar surges faster and faster for a while
export default {
  label: "Ley Lines",
  chance: 0.03,
  style: "summon",
  // the speed a bar surges up to, over how long (ms; its own ownMs)
  values: { speed: 2.5, ms: 30_000, ownMs: 60_000 },
} satisfies CritMeta;
