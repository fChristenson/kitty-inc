import type { CritMeta } from "../../../critKit/meta";

// a ring of wisp gunners wheeling under the total, firing up into it one
// after another, then all of them firing themselves in at once
export default {
  label: "Round Robin",
  chance: 0.03,
  style: "gunfire",
} satisfies CritMeta;
