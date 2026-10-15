import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Recruitment Drive",
  color: COLOR.blue,
  icon: "recruitmentDrive",
  description: "Fills this floor and unlocked floors above",
  chance: 0.06,
} satisfies ProcMeta;
