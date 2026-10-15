import { COLOR } from "../../../../palette";
import type { ProcMeta } from "../../procMeta";

export default {
  label: "Team Building",
  color: COLOR.teamBuildingCoral,
  icon: "teamBuilding",
  description: "Hires a free worker on every unlocked floor",
  chance: 0.03,
} satisfies ProcMeta;
