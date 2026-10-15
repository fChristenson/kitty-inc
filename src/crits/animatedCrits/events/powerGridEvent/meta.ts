import type { EventMeta } from "../../eventMeta";

// bolts zigzag pylon to pylon up the bars like a grid powering up
export default {
  label: "Power Grid",
  style: "lightning",
  reward: "levels",
  chance: 0.01,
  values: {
    linksMs: [240, 110] as [number, number], // between lines, quickening
    levelShare: 0.05,
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
