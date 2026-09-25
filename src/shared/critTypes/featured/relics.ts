import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const RELICS_CRIT_INFO = {
  ancientRelic: {
    label: "Ancient Relic",
    color: COLOR.mergerGold,
    icon: "ancientRelic",
    description: "Thirty-five instant payouts on this floor",
  },
  geometricRelic: {
    label: "Geometric Relic",
    color: COLOR.mergerGold,
    icon: "geometricRelic",
    description: "Thirty-four instant payouts on this floor",
  },
  emberKey: {
    label: "Ember Key",
    color: COLOR.red,
    icon: "emberKey",
    description: "Thirty-two free upgrades on this floor",
  },
  frostRune: {
    label: "Frost Rune",
    color: COLOR.frozenIceBlue,
    icon: "frostRune",
    description: "Twenty-nine upgrades on this floor and every floor below",
  },
  memoryCrystal: {
    label: "Memory Crystal",
    color: COLOR.cyan,
    icon: "memoryCrystal",
    description: "One tier promotion and twenty-one upgrades here",
  },
  neonBeaker: {
    label: "Neon Beaker",
    color: COLOR.teal,
    icon: "neonBeaker",
    description: "Thirty-two payouts from the highest-earning floor",
  },
  rainbowRelic: {
    label: "Rainbow Relic",
    color: COLOR.royalFlushPurple,
    icon: "rainbowRelic",
    description: "One tier promotion and twenty-three upgrades here",
  },
  whisperingOrb: {
    label: "Whispering Orb",
    color: COLOR.purple,
    icon: "whisperingOrb",
    description: "One tier promotion and twenty-five upgrades here",
  },
  lionKey: {
    label: "Lion Key",
    color: COLOR.goldenHandshakeGold,
    icon: "lionKey",
    description: "One tier promotion and twenty-six upgrades here",
  },
  restorationProject: {
    label: "Restoration Project",
    color: COLOR.gold,
    icon: "restorationProject",
    description: "Thirty free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
