import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Team Lunch",
  color: COLOR.teamBuildingCoral,
  icon: "teamLunch",
  description: "Doubles every worker's boost duration",
  chance: 0.08,
} satisfies ProcMeta;
