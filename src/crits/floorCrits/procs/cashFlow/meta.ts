import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Cash Flow",
  color: COLOR.moneyGreen,
  icon: "cashFlow",
  description: "Pays one combined income cycle",
  chance: 0.03,
} satisfies ProcMeta;
