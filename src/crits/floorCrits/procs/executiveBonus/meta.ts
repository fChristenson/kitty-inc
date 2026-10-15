import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Executive Bonus",
  color: COLOR.gold,
  icon: "executiveBonus",
  description: "Pays 25% of company value",
  chance: 0.04,
} satisfies ProcMeta;
