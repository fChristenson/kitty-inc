import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Fire Drill",
  color: COLOR.red,
  icon: "fireDrill",
  description: "Completes every floor's income timer at once",
  chance: 0.08,
} satisfies ProcMeta;
