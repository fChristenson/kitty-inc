import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const RELICS_CRITS = {
  ancientRelic: {
    label: "Ancient Relic",
    color: COLOR.mergerGold,
    image: "crits/relics/ancientRelic.webp",
    description: "Thirty-five instant payouts on this floor",
  },
  geometricRelic: {
    label: "Geometric Relic",
    color: COLOR.mergerGold,
    image: "crits/relics/geometricRelic.webp",
    description: "Cuts every price in this building by 1.4%",
  },
  emberKey: {
    label: "Ember Key",
    color: COLOR.red,
    image: "crits/relics/emberKey.webp",
    description: "Unlocks the next floor for free",
  },
  frostRune: {
    label: "Frost Rune",
    color: COLOR.frozenIceBlue,
    image: "crits/relics/frostRune.webp",
    description: "Cuts every price in this building by 2.4%",
  },
  memoryCrystal: {
    label: "Memory Crystal",
    color: COLOR.cyan,
    image: "crits/relics/memoryCrystal.webp",
    description: "One tier promotion and twenty-one upgrades here",
  },
  neonBeaker: {
    label: "Neon Beaker",
    color: COLOR.teal,
    image: "crits/relics/neonBeaker.webp",
    description: "Thirty-two payouts from the highest-earning floor",
  },
  rainbowRelic: {
    label: "Rainbow Relic",
    color: COLOR.royalFlushPurple,
    image: "crits/relics/rainbowRelic.webp",
    description: "One tier promotion and twenty-three upgrades here",
  },
  whisperingOrb: {
    label: "Whispering Orb",
    color: COLOR.purple,
    image: "crits/relics/whisperingOrb.webp",
    description: "One tier promotion and twenty-five upgrades here",
  },
  lionKey: {
    label: "Lion Key",
    color: COLOR.goldenHandshakeGold,
    image: "crits/relics/lionKey.webp",
    description: "One tier promotion and twenty-six upgrades here",
  },
  restorationProject: {
    label: "Restoration Project",
    color: COLOR.gold,
    image: "crits/relics/restorationProject.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
  },
  relicCompass: {
    label: "Relic Compass",
    color: COLOR.autumnSaleAmber,
    image: "crits/relics/relicCompass.webp",
    description: "Sixty-one upgrades on the highest unlocked floor",
  },
} as const satisfies Record<string, FeaturedCritData>;
