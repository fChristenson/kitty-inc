import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Fancy Friday",
  color: COLOR.fancyFridayIndigo,
  icon: "fancyFriday",
  description: "Ten free upgrades on every unlocked floor",
  chance: 0.025,
  values: {
    upgrades: 10,
  },
} satisfies ProcMeta;
