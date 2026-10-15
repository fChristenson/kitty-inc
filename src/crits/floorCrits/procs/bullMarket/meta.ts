import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Bull Market",
  color: COLOR.bullMarketGreen,
  icon: "bull",
  description: "Doubles every unlocked floor's own upgrade count",
  chance: 0.02,
} satisfies ProcMeta;
