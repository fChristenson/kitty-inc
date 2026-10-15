import type { EventMeta } from "../../eventMeta";

// hordes of glitter close in on a hero wisp that levels up its weapons (gun,
// orbiting blades, chain lightning, nova) and wipes them out
export default {
  label: "Survivors",
  style: "bullet heaven",
  reward: "cash",
  chance: 0.01,
  values: {
    hordeMs: 1500, // the horde spawning in from the edges
    orbitAtMs: 650, // the blades level-up
    chainAtMs: 1300, // the chain lightning level-up
    novaAtMs: 1950, // the nova wiping the rest
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
