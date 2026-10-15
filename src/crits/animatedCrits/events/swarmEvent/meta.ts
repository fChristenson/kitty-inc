import type { EventMeta } from "../../eventMeta";

// the rare "Swarm" event: its proc animation leaves that button armed;
// clicking it starts a timed swarm sale where every click on it pays a Sale
// payout from it and each of its mirrored clones
export default {
  label: "Swarm",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    durationMs: 15_000,
  },
} as const satisfies EventMeta;
