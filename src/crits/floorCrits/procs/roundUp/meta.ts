import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Round Up",
  color: COLOR.orange,
  icon: "roundUp",
  description: "Tops every floor up to the next 10 upgrades",
  chance: 0.04,
  values: {
    step: 10,
  },
} satisfies ProcMeta;
