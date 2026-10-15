import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Double Down",
  color: COLOR.doubleDownCrimson,
  icon: "doubleDown",
  description: "Replays the crit that spawned it twice more",
  chance: 0.015,
  values: {
    repeats: 2,
  },
} satisfies ProcMeta;
