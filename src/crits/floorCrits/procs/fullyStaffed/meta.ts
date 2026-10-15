import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Fully Staffed",
  color: COLOR.fullyStaffedGreen,
  icon: "fullyStaffed",
  description: "Hires workers and managers on every unlocked floor",
  chance: 0.02,
} satisfies ProcMeta;
