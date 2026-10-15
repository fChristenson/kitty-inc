import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Upgrade",
  color: COLOR.cyan,
  icon: "upgrade",
  description: "Upgrades the floor's crit tier",
  chance: 0.012,
} satisfies ProcMeta;
