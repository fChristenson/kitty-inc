import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Casual Friday",
  color: COLOR.teal,
  icon: "casualFriday",
  description: "Five free upgrades on every unlocked floor",
  chance: 0.05,
  values: {
    upgrades: 5,
  },
} satisfies ProcMeta;
