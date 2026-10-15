import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Boost",
  color: COLOR.blue,
  icon: "mouse",
  description: "Boosts every worker for free",
  chance: 0.1,
} satisfies ProcMeta;
