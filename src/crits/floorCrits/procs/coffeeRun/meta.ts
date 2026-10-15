import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Coffee Run",
  color: COLOR.teal,
  icon: "coffeeRun",
  description: "Boosts every worker for a full minute",
  chance: 0.03,
} satisfies ProcMeta;
