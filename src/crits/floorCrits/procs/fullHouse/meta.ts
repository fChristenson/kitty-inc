import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Full House",
  color: COLOR.fullHouseCrimson,
  icon: "fullHouse",
  description: "Upgrades 5 floors' crit tier",
  chance: 0.003,
  values: {
    floors: 5,
  },
} satisfies ProcMeta;
