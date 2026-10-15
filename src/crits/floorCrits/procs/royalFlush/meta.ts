import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Royal Flush",
  color: COLOR.purple,
  icon: "royalFlush",
  description: "Upgrades 6 floors' crit tier",
  chance: 0.0015,
  values: {
    floors: 6,
  },
} satisfies ProcMeta;
