import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Merger",
  color: COLOR.gold,
  icon: "merger",
  description: "Raises lower unlocked floors to this level",
  chance: 0.03,
} satisfies ProcMeta;
