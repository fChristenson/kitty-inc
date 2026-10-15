import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Shift Change",
  color: COLOR.teamBuildingCoral,
  icon: "shiftChange",
  description: "Fills this floor and the one below",
  chance: 0.08,
} satisfies ProcMeta;
