import type { CritMeta } from "../../../critKit/meta";

// a gun wisp nailing every button, its next crit then sticking on it
export default {
  label: "Nail Gun",
  chance: 0.03,
  style: "gunfire",
  values: {
    // the taps a crit landing on a Nail Gun's button plays for (twice on its
    // own)
    taps: 3,
  },
} satisfies CritMeta;
