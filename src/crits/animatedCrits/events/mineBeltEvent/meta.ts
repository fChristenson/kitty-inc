import type { EventMeta } from "../../eventMeta";

// on the flight stage, rows of blinking bomb wisps drift in, twin beams rake
// each row setting its mines off in a chain, the last row going up together
export default {
  label: "Mine Belt",
  style: "flight",
  reward: "levels",
  chance: 0.01,
  values: {
    levelShare: 0.012, // free levels on the floor per mine
  },
} as const satisfies EventMeta;
