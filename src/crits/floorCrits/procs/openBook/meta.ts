import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Open Book",
  color: COLOR.cyan,
  icon: "openBook",
  description: "Pays the value of all bought upgrades",
  chance: 0.02,
} satisfies ProcMeta;
