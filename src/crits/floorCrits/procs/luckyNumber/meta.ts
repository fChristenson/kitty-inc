import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Lucky Number",
  color: COLOR.gold,
  icon: "luckyNumber",
  description: "Unlocks 2-12 floors for free",
  chance: 0.001,
  values: {
    minFloors: 2,
    maxFloors: 12,
  },
} satisfies ProcMeta;
