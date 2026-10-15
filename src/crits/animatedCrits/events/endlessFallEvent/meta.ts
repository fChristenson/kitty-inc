import type { EventMeta } from "../../eventMeta";

// a wisp falling down the screen into a ring under the floors and out of its
// twin over them, again and again, faster each pass, every floor it passes
// taking levels; the rings snap shut and it bursts out onto every floor
export default {
  label: "Endless Fall",
  style: "portal",
  reward: "levels",
  chance: 0.01,
  values: {
    firstMs: 220, // the rings snapping open till the wisp first drops
    passes: 7, // falls down the screen
    fallMs: 460, // the first fall, each next one `quicken` of the last
    quicken: 0.76,
    passShare: 0.015, // levels a floor takes each time the wisp falls past
    finalShare: 0.06, // and from the last burst
    burstMs: 220, // the shards from the shut ring onto the floors
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
