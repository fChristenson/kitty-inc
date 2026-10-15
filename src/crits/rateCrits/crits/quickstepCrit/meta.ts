import type { CritMeta } from "../../../critKit/meta";

// a wisp hopping along every bar, each payout after quicker than the last
export default {
  label: "Quickstep",
  chance: 0.03,
  style: "bounce",
  values: {
    // for ms every landing and payout speeds a bar up by step, up to maxSpeed
    ms: 30_000,
    step: 0.1,
    maxSpeed: 3,
  },
} satisfies CritMeta;
