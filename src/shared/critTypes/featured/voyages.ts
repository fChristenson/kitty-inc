import type { VOYAGES_CRITS } from "../../critData/voyages";
import type { FeaturedRewards } from "./types";

export const VOYAGES_REWARDS = {
  anchorInk: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.anchorInkGrowth),
  blueSails: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.blueSailsUpgrades),
  grumpyDeckhands: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.grumpyDeckhandsGrowth),
  hookAndScar: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.hookAndScarUpgrades),
  plumedPowerhouse: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.plumedPowerhouseGrowth),
  shipmateSqueeze: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.shipmateSqueezeUpgrades),
  skullHatCrest: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.skullHatCrestGrowth),
  stripedSkipper: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.stripedSkipperUpgrades),
  tealPatch: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.tealPatchGrowth),
  doubleDenim: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.doubleDenimShare),
  lassoLadies: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.lassoLadiesShare),
  rodeoPals: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rodeoPalsShare),
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
  chooChoo: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chooChooShare),
  clockTower: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.clockTowerShare),
  commuterLine: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.commuterLineShare),
  mainStreet: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.mainStreetShare),
  rooftopRainbow: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rooftopRainbowShare),
  steamExpress: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.steamExpressShare),
} satisfies FeaturedRewards<typeof VOYAGES_CRITS>;
