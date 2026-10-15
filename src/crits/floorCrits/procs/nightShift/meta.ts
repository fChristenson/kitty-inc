import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Night Shift",
  color: COLOR.nightShiftIndigo,
  icon: "sleepyMoon",
  description: "Short worker boost, counts as +1 worker",
  chance: 0.08,
} satisfies ProcMeta;
