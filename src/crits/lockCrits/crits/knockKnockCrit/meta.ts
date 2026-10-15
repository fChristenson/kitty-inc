import type { CritMeta } from "../../../critKit/meta";

// a wisp knocking on the lock, a crowd of them joining in faster and faster,
// then all crashing in at once: the floor bursts open and they settle round
// its button; its next payouts each also hire a worker there
export default {
  label: "Knock Knock",
  chance: 0.03,
  style: "wisp",
  // how many of the opened floor's payouts each hire a worker on it
  values: { payouts: 6 },
} satisfies CritMeta;
