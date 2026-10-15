import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Tea Break",
  color: COLOR.teaBreakBrown,
  icon: "teaBreak",
  description: "Pauses every floor, then pays them together",
  chance: 0.08,
} satisfies ProcMeta;
