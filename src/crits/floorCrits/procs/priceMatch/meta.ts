import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Price Match",
  color: COLOR.cyan,
  icon: "priceMatch",
  description: "Matches this floor to the cheapest upgrade price for 5s",
  chance: 0.05,
  values: {
    durationMs: 5000,
  },
} satisfies ProcMeta;
