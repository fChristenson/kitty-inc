import type { CritMeta } from "../../../critKit/meta";

// a magic circle drawn flat round the lock, turning faster and faster until
// a pillar of light blows it open; the circle slides onto the new floor's
// button and summons a cat there, already perma tiers up
export default {
  label: "Magic Circle",
  chance: 0.03,
  style: "summon",
  values: {
    // the perma tiers the summoned cat arrives with
    permaTiers: 2,
  },
} satisfies CritMeta;
