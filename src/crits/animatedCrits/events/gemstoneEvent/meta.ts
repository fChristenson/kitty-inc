import type { EventMeta } from "../../eventMeta";

// glitter all over the frozen screen is sucked into a giant gem, a trickle
// then a flood, the gem crushing smaller and whiter, trembling harder; it
// blazes and bursts, its shards diving onto every bar, the clicked one last a
// crit tier up
export default {
  label: "Gemstone",
  style: "charge + drawing",
  reward: "levels + crit tier",
  chance: 0.01,
  values: {
    chargeMs: 1300, // from the click till the gem bursts
    shardMs: 160, // from the burst till the first shard lands
    shardGapMs: 45, // between the shards landing
    levelShare: 0.002, // levels a shard lands on its bar
    winnerShare: 0.006, // levels the last shard lands on the clicked bar
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
