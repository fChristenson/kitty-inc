import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const COSMOS_CRIT_INFO = {
  blackHole: {
    label: "Black Hole",
    color: COLOR.royalFlushPurple,
    icon: "blackHole",
    description: "Twenty-six payouts on every unlocked floor",
  },
  bottledNebula: {
    label: "Bottled Nebula",
    color: COLOR.halloweenSalePurple,
    icon: "bottledNebula",
    description: "One tier promotion and sixteen upgrades here",
  },
  eclipse: {
    label: "Eclipse",
    color: COLOR.orange,
    icon: "eclipse",
    description: "Twenty-seven upgrades on the highest unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
