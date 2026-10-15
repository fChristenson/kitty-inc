import type { EventMeta } from "../../eventMeta";

// guns pound a shield round the button till it shatters
export default {
  label: "Shield Breaker",
  style: "gunfire",
  reward: "a crit tier",
  chance: 0.01,
  values: {
    shotsMs: [120, 55] as [number, number], // between shots, quickening
    holdMs: 400,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
