import type { EventMeta } from "../../eventMeta";

// on the flight stage down a corridor of beam frames, an aim laser locks each
// wisp of a squadron in turn, then homing wisps blow them all in a rattling
// chain; three volleys, the last a whirling ring round a huge blast
export default {
  label: "Lock-On Volley",
  style: "flight",
  reward: "perma tier",
  chance: 0.01,
} as const satisfies EventMeta;
