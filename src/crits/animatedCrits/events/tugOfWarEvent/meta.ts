import type { EventMeta } from "../../eventMeta";

// two wisps heave a rope of cash till it snaps
export default {
  label: "Tug of War",
  chance: 0.01,
  values: {
    fillMs: 350, // the button gushing the rope full
    flyMs: 300, // each coin's arc up onto the rope
    flowMs: 900, // each coin's run along the rope
    leadMs: 450, // before the first heave
    heaveGapMs: 230, // between heaves
    recoilMs: 180, // the snapped halves whipping back
    jetMs: 280, // each wisp flinging its half
    flightMs: 350, // each coin's (and wisp's) flight into the total
    holdMs: 250,
    mergeMs: 500,
  },
} as const satisfies EventMeta;
