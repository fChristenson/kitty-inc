import type { EventMeta } from "../../eventMeta";

// the rare "Overload" event: the clicked floor's income bar overheats,
// shuddering and sparking ever harder, then blows in a huge explosion and
// jumps one crit tier
export default {
  label: "Overload",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    chargeMs: 1_000, // overheating
    suckMs: 110, // sucking in before it blows
    holdMs: 600, // after the blast, before the screen unfreezes
  },
} as const satisfies EventMeta;
