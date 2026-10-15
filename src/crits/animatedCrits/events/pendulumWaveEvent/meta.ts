import type { EventMeta } from "../../eventMeta";

// a row of pendulum wisps swing in waves
export default {
  label: "Pendulum Wave",
  style: "wisp",
  chance: 0.01,
  values: {
    swingMs: 1_400, // swinging
    fireMs: 280, // each wisp's flight into the total
    holdMs: 400,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
