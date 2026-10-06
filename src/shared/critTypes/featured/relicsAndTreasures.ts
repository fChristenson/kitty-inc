import type { RELICS_AND_TREASURES_CRITS } from "../../critData/relicsAndTreasures";
import type { FeaturedRewards } from "./types";

export const RELICS_AND_TREASURES_REWARDS = {
  ancientRelic: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.ancientRelicPayouts),
  geometricRelic: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.geometricRelicDiscount),
  emberKey: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.emberKeyFloors),
  frostRune: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.frostRuneDiscount),
  memoryCrystal: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.memoryCrystalTierSteps,
      balance.memoryCrystalUpgrades,
    ),
  neonBeaker: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.neonBeakerPayouts,
    ),
  rainbowRelic: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.rainbowRelicTierSteps,
      balance.rainbowRelicUpgrades,
    ),
  whisperingOrb: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.whisperingOrbTierSteps,
      balance.whisperingOrbUpgrades,
    ),
  lionKey: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.lionKeyTierSteps,
      balance.lionKeyUpgrades,
    ),
  restorationProject: (context, { actions, lowestLevel }) =>
    actions.armCrit([lowestLevel(context)], "crit"),
  relicCompass: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.relicCompassUpgrades),
  theMoonstoneKey: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.theMoonstoneKeyTierSteps,
      balance.theMoonstoneKeyUpgrades,
    ),
  spellbookSupreme: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.spellbookSupremeFloors),
  prismPotion: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.prismPotionPayouts,
    ),
  galaxyGumball: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  treasureTruffle: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  wizardsWaffle: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  goldenFortuneCookie: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  crystalDragonEgg: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.crystalDragonEggUpgrades),
  diamondCompass: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  emeraldCrown: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.emeraldCrownTierSteps,
      balance.emeraldCrownUpgrades,
    ),
  goldenFleece: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.goldenFleecePayouts),
  imperialScepter: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  rubyHeartRelic: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.rubyHeartRelicPayouts),
  sapphireHourglass: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  vaultOfJewels: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.vaultOfJewelsUpgrades),
  goldenIdol: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.goldenIdolUpgrades),
  chestOfSwag: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chestOfSwagShare),
  heavyIsTheHead: (context, { actions }) =>
    actions.armCrit([context.floor], "mega"),
} satisfies FeaturedRewards<typeof RELICS_AND_TREASURES_CRITS>;
