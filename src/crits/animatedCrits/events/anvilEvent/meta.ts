import type { EventMeta } from "../../eventMeta";

// a little wisp by the workers of each floor in view, anvils of light
// dropping onto them one after another down the building, quicker and
// heavier each, every crushed wisp bursting into sparks onto its floor's
// workers, a perma tier each; then a giant anvil wobbling high over the
// clicked floor slams down hardest, its workers all promoted
export default {
  label: "Anvil",
  style: "crush",
  reward: "perma tiers",
  chance: 0.01,
  values: {
    firstMs: 200, // from the click till the first anvil hangs over its wisp
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
