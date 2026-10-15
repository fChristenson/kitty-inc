import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Bonus Round",
  color: COLOR.gold,
  icon: "bonusRound",
  description: "Completes this floor's income timer twice",
  chance: 0.08,
} satisfies ProcMeta;
