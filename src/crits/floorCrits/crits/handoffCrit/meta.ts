import type { CritMeta } from "../../../critKit/meta";

// a wisp waiting by every bar's readout; the number smacks into the top one
// and each struck wisp shoots on to the next bar down, Newton's-cradle
// style, quicker and harder; the last rebounds back up the chain, knocking
// every spent wisp into one big ball that slams into its own bar
export default {
  label: "Handoff",
  chance: 0.03,
  style: "wisp",
  isNew: true,
} satisfies CritMeta;
