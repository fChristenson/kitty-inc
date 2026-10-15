import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Pair",
  color: COLOR.blue,
  icon: "pair",
  description: "Upgrades 2 floors' crit tier",
  chance: 0.02,
  values: {
    floors: 2,
  },
} satisfies ProcMeta;
