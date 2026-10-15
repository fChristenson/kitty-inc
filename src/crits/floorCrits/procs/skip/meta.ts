import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Skip",
  color: COLOR.cyan,
  icon: "skip",
  description: "Unlocks every floor and buys its upgrade items for free",
  chance: 0.00015,
} satisfies ProcMeta;
