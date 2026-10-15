import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Talent Scout",
  color: COLOR.orange,
  icon: "talentScout",
  description: "Adds and boosts a worker on this floor",
  chance: 0.08,
} satisfies ProcMeta;
