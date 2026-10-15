import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Domino Effect",
  color: COLOR.blue,
  icon: "dominoEffect",
  description: "Doubles upgrades across a lucky floor run",
  chance: 0.04,
  values: {
    continueChance: 0.5,
  },
} satisfies ProcMeta;
