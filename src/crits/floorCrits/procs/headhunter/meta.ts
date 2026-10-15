import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Headhunter",
  color: COLOR.headhunterRust,
  icon: "headhunter",
  description: "Matches this floor to the best-staffed one",
  chance: 0.06,
} satisfies ProcMeta;
