import type { CritMeta } from "../../../critKit/meta";

// a huge glowing sledgehammer swinging down the building, slamming the wisp
// on every readout flat, its own last and hardest: each bar's next fills run
// fast, the last of them landing one huge payout
export default {
  label: "Sledgehammer",
  chance: 0.03,
  style: "crush",
  // the fills' speed, how many (its own ownBlows) and the last one's payout
  // multiple (its own ownSmash)
  values: { speed: 2, blows: 4, ownBlows: 6, smash: 6, ownSmash: 10 },
} satisfies CritMeta;
