import type { CritMeta } from "../../../critKit/meta";

// a hole at every readout swallowing a swirl of glitter and spitting it all
// into the next, bigger each: every bar pays much more, fading off
export default {
  label: "Swallow",
  chance: 0.03,
  style: "pull",
  // how many times as much a bar pays at first, fading to normal over ms
  // (its own ownMs)
  values: { payout: 3, ms: 30_000, ownMs: 60_000 },
} satisfies CritMeta;
