import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const ANCIENT_ROME_CRITS = {
  arenaAllies: {
    label: "Arena Allies",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/arenaAllies.webp",
    description: "Adds 37.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.arenaAlliesShare),
  },
  bronzeBreastplate: {
    label: "Bronze Breastplate",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/bronzeBreastplate.webp",
    description: "Adds 37.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bronzeBreastplateShare),
  },
  colosseum: {
    label: "Colosseum",
    color: COLOR.gold,
    image: "crits/ancientRome/colosseum.webp",
    description: "Adds 37.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.colosseumShare),
  },
  gildedWarriors: {
    label: "Gilded Warriors",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/ancientRome/gildedWarriors.webp",
    description: "Adds 37.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.gildedWarriorsShare),
  },
  goldenGladiatrix: {
    label: "Golden Gladiatrix",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/goldenGladiatrix.webp",
    description: "Adds 37.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenGladiatrixShare),
  },
  plumedHelmet: {
    label: "Plumed Helmet",
    color: COLOR.chairGiveawayBrown,
    image: "crits/ancientRome/plumedHelmet.webp",
    description: "Adds 37.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.plumedHelmetShare),
  },
  sandalStrut: {
    label: "Sandal Strut",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/ancientRome/sandalStrut.webp",
    description: "Adds 37.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sandalStrutShare),
  },
  shieldWall: {
    label: "Shield Wall",
    color: COLOR.supplyRunTan,
    image: "crits/ancientRome/shieldWall.webp",
    description: "Adds 38% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shieldWallShare),
  },
  shortSwords: {
    label: "Short Swords",
    color: COLOR.amberMuted,
    image: "crits/ancientRome/shortSwords.webp",
    description: "Adds 38.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.shortSwordsShare),
  },
  templeMaidens: {
    label: "Temple Maidens",
    color: COLOR.sameBoatCoral,
    image: "crits/ancientRome/templeMaidens.webp",
    description: "Adds 38.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.templeMaidensShare),
  },
  togaParty: {
    label: "Toga Party",
    color: COLOR.teaBreakBrown,
    image: "crits/ancientRome/togaParty.webp",
    description: "Adds 38.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.togaPartyShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
