import type { CritMeta } from "../../../critKit/meta";

// a wisp sits on every bar's readout; the number turns wisp and hops onto
// the top one's back, and the pile leaps bar to bar, each bar's wisp
// climbing on underneath, the stack taller, wobblier and quicker every
// leap; on its own bar the teetering tower topples, every wisp crashing
// into the bar one after another, the top one in the biggest blast
export default {
  label: "Piggyback",
  chance: 0.03,
  style: "wisp",
} satisfies CritMeta;
