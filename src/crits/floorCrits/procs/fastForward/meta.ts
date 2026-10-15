import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Fast Forward",
  color: COLOR.blue,
  icon: "fastforward",
  description: "Instantly credits 4 payouts' worth of income",
  chance: 0.05,
} satisfies ProcMeta;
