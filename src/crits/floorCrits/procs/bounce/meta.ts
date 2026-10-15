import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Bounce",
  color: COLOR.blue,
  icon: "ball",
  description: "Repeats the crit on the floor below",
  chance: 0.08,
  values: {
    continueChance: 0.5,
  },
} satisfies ProcMeta;
