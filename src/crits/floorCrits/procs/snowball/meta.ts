import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Snowball",
  color: COLOR.blue,
  icon: "snowball",
  description: "Pays every floor once, times floors unlocked",
  chance: 0.05,
} satisfies ProcMeta;
