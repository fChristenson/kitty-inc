import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Overflow",
  color: COLOR.blue,
  icon: "overflow",
  description: "Pays five timer payouts on this floor",
  chance: 0.06,
} satisfies ProcMeta;
