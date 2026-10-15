import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Boom",
  color: COLOR.blue,
  icon: "explosion",
  description: "Repeats the crit up and down at once",
  chance: 0.06,
  values: {
    continueChance: 0.5,
  },
} satisfies ProcMeta;
