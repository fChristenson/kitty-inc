import type { EventMeta } from "../../eventMeta";

// lightning grows into a snowflake
export default {
  label: "Snowflake",
  style: "lightning",
  reward: "cash",
  chance: 0.01,
  values: {
    stageMs: 300, // each stage of growth
    blazeMs: 400, // the flake blazing before it shatters
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
