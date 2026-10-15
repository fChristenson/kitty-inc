import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Keynote",
  color: COLOR.gold,
  icon: "keynote",
  description: "Adds 10 free upgrades to the crit floor",
  chance: 0.03,
  values: {
    upgrades: 10,
  },
} satisfies ProcMeta;
