import type { EventMeta } from "../../eventMeta";

// two teams of wisps hurl balls
export default {
  label: "Dodgeball",
  style: "wisp",
  reward: "cash",
  chance: 0.01,
  values: {
    lineUpMs: 300, // the teams lining up
    gapsMs: [260, 110] as [number, number], // between volleys, quickening
    flyMs: 260, // each ball's flight
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
