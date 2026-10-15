import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Rain Check",
  color: COLOR.blue,
  icon: "rainCheck",
  description: "Adds 5s of this building's income",
  chance: 0.03,
  values: {
    seconds: 5,
  },
} satisfies ProcMeta;
