import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Spending Freeze",
  color: COLOR.teal,
  icon: "spendingFreeze",
  description: "Locks every unlocked floor's upgrade price for 5s",
  chance: 0.05,
  values: {
    durationMs: 5000,
  },
} satisfies ProcMeta;
