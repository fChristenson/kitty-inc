import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Tick Tock",
  color: COLOR.teal,
  icon: "clock",
  description: "Pays every floor twice, instantly",
  chance: 0.09,
} satisfies ProcMeta;
