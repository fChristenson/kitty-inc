import type { CritMeta } from "../../../critKit/meta";

// a tiny spinning star sweeping two beams ignites beside the bars and tears
// the sparks off every readout along its field lines, swells, collapses to a
// pin and bursts, flinging them home: the bars it lands on are magnetized,
// every payout of one jolting all the others ahead
export default {
  label: "Magnetar",
  chance: 0.03,
  style: "pull",
  // for `ms` (`ownMs` on its own bar) every payout of a magnetized bar runs
  // every other one `speed` times as fast for `burstMs` (a lone one, itself)
  values: { ms: 15000, ownMs: 25000, speed: 3, burstMs: 600 },
  isNew: true,
} satisfies CritMeta;
