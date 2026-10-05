import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const ANCIENT_ROME_CRITS = {
  arenaAllies: {
    label: "Arena Allies",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/arenaAllies.webp",
    description: "Adds 37.3% of your total income",
  },
  bronzeBreastplate: {
    label: "Bronze Breastplate",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/bronzeBreastplate.webp",
    description: "Adds 37.4% of your total income",
  },
  colosseum: {
    label: "Colosseum",
    color: COLOR.gold,
    image: "crits/ancientRome/colosseum.webp",
    description: "Adds 37.5% of your total income",
  },
  gildedWarriors: {
    label: "Gilded Warriors",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/ancientRome/gildedWarriors.webp",
    description: "Adds 37.6% of your total income",
  },
  goldenGladiatrix: {
    label: "Golden Gladiatrix",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/goldenGladiatrix.webp",
    description: "Adds 37.7% of your total income",
  },
  plumedHelmet: {
    label: "Plumed Helmet",
    color: COLOR.chairGiveawayBrown,
    image: "crits/ancientRome/plumedHelmet.webp",
    description: "Adds 37.8% of your total income",
  },
  sandalStrut: {
    label: "Sandal Strut",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/ancientRome/sandalStrut.webp",
    description: "Adds 37.9% of your total income",
  },
  shieldWall: {
    label: "Shield Wall",
    color: COLOR.supplyRunTan,
    image: "crits/ancientRome/shieldWall.webp",
    description: "Adds 38% of your total income",
  },
  shortSwords: {
    label: "Short Swords",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/shortSwords.webp",
    description: "Adds 38.1% of your total income",
  },
  templeMaidens: {
    label: "Temple Maidens",
    color: COLOR.sameBoatCoral,
    image: "crits/ancientRome/templeMaidens.webp",
    description: "Adds 38.2% of your total income",
  },
  togaParty: {
    label: "Toga Party",
    color: COLOR.teaBreakBrown,
    image: "crits/ancientRome/togaParty.webp",
    description: "Adds 38.3% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
