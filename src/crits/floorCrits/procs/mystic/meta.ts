import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Mystic",
  color: COLOR.teal,
  icon: "mystic",
  description: "Builds one free building with 10 upgrades",
  chance: 0.001,
  values: {
    upgrades: 10,
  },
} satisfies ProcMeta;
