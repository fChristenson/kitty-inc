import type { ANCIENT_ROME_CRITS } from "../../critData/ancientRome";
import type { FeaturedRewards } from "./types";

export const ANCIENT_ROME_REWARDS = {
  arenaAllies: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.arenaAlliesShare),
  bronzeBreastplate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bronzeBreastplateShare),
  colosseum: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.colosseumShare),
  gildedWarriors: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.gildedWarriorsShare),
  goldenGladiatrix: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.goldenGladiatrixShare),
  plumedHelmet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.plumedHelmetShare),
  sandalStrut: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.sandalStrutShare),
  shieldWall: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shieldWallShare),
  shortSwords: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.shortSwordsShare),
  templeMaidens: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.templeMaidensShare),
  togaParty: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.togaPartyShare),
} satisfies FeaturedRewards<typeof ANCIENT_ROME_CRITS>;
