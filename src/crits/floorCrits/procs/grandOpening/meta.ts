import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Grand Opening",
  color: COLOR.grandOpeningRose,
  icon: "grandOpening",
  description: "Buys the next building free, or unlocks all floors",
  chance: 0.001,
} satisfies ProcMeta;
