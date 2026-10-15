import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Chain",
  color: COLOR.blue,
  icon: "chain",
  description: "Repeats the crit on the floor above",
  chance: 0.08,
  values: {
    continueChance: 0.5,
  },
} satisfies ProcMeta;
