import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Four of a Kind",
  color: COLOR.fourOfAKindIndigo,
  icon: "fourOfAKind",
  description: "Upgrades 4 floors' crit tier",
  chance: 0.006,
  values: {
    floors: 4,
  },
} satisfies ProcMeta;
