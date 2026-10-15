import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Espresso Shot",
  color: COLOR.espressoShotBrown,
  icon: "espressoShot",
  description: "Boosts every worker for 15 seconds",
  chance: 0.08,
} satisfies ProcMeta;
