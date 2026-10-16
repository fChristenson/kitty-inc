import type { CritMeta } from "../../../critKit/meta";

// a long drill bit tipped with a big diamond biting into the lock from the
// side and boring through, the diamond tip flying onto the new floor's
// button: its next taps each promote its lowest-tier cat a perma tier
export default {
  label: "Diamond Drill",
  chance: 0.03,
  style: "drill",
  values: {
    // the opened floor's next taps that each promote a cat a perma tier
    taps: 3,
  },
  isNew: true,
} satisfies CritMeta;
