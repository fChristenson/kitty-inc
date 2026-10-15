import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Reinforcements",
  color: COLOR.cloneArmyViolet,
  icon: "cloneArmy",
  description: "Copies the strongest workforce to every floor",
  chance: 0.03,
} satisfies ProcMeta;
