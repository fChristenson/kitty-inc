import type { EventMeta } from "../../eventMeta";

// wisps free-fall into a ring, then break off and parachute onto empty spots
export default {
  label: "Skydivers",
  style: "wisp",
  reward: "hires",
  chance: 0.01,
  values: {
    fallMs: 650, // free-falling into the ring
    holdLinkMs: 180, // falling linked up
    divesMs: [260, 380] as [number, number], // each diver's plunge to its chute
    floatMs: 320, // floating down under the chute
    holdMs: 500,
    mergeMs: 0,
  },
} as const satisfies EventMeta;
