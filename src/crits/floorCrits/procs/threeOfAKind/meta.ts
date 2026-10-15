import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Three of a Kind",
  color: COLOR.threeOfAKindGreen,
  icon: "threeOfAKind",
  description: "Upgrades 3 floors' crit tier",
  chance: 0.012,
  values: {
    floors: 3,
  },
} satisfies ProcMeta;
