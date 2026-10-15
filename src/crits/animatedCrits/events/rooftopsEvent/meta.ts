import type { EventMeta } from "../../eventMeta";

// the floors' screen tips flat into the first roof; the view sprints over the
// night rooftops leaping the gaps, dropping guards mid-leap, and leaps
// through a lit window across the street onto the floors
export default {
  label: "Rooftops",
  style: "fps",
  reward: "hires",
  chance: 0.01,
  values: {
    tipMs: 300, // the floors' screen tipping forward flat
    flyMs: 0, // the leap at the window is the landing
    hireGapMs: 80, // between the hires, floor by floor
  },
} as const satisfies EventMeta;
