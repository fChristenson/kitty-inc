import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Safety Net",
  color: COLOR.orange,
  icon: "safetyNet",
  description: "Adds 5 upgrades to the priciest floor",
  chance: 0.04,
  values: {
    upgrades: 5,
  },
} satisfies ProcMeta;
