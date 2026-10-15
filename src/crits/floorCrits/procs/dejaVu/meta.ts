import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Deja Vu",
  color: COLOR.blue,
  icon: "dejaVu",
  description: "Repeats a random crit twice",
  chance: 0.02,
} satisfies ProcMeta;
