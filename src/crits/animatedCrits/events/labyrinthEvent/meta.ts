import type { EventMeta } from "../../eventMeta";

// a maze flood-filled with gold, its path pouring cash
export default {
  label: "Labyrinth",
  style: "experiment",
  reward: "cash",
  chance: 0.01,
  values: {
    appearMs: 200,
    floodMs: 1200, // the flood spreading to the farthest corner
    blazeMs: 450, // the path blazing back
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
