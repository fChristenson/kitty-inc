import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "First Class",
  color: COLOR.blue,
  icon: "firstClass",
  description: "Unlocks the next floor at the cheapest starting price",
  chance: 0.05,
} satisfies ProcMeta;
