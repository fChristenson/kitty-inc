import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Dress Code",
  color: COLOR.dressCodeGreen,
  icon: "dressCode",
  description: "Adds managers, then workers, building-wide",
  chance: 0.08,
} satisfies ProcMeta;
