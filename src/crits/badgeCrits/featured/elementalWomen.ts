import type { ELEMENTAL_WOMEN_CRITS } from "../critData/elementalWomen";
import type { FeaturedRewards } from "./types";

export const ELEMENTAL_WOMEN_REWARDS = {
  flameFlirt: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.flameFlirtBoostSeconds,
      balance.flameFlirtExtraWorkers,
    ),
  tidalTease: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.tidalTeasePayouts),
  riptideRomance: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.riptideRomanceFloors),
  zephyrGlamour: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.zephyrGlamourContinueChance),
  galeGala: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.galeGalaDiscount),
  crosswindCrush: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.crosswindCrushBoostSeconds,
      balance.crosswindCrushExtraWorkers,
    ),
  windfallWaltz: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.windfallWaltzFloors),
  glacialGlam: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.glacialGlamUpgrades),
  snowglobeWink: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  iceboxIdol: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.iceboxIdolWorkers),
  joltValentine: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.joltValentineTierSteps,
      balance.joltValentineUpgrades,
    ),
  sparkSweetheart: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.sparkSweetheartBoostSeconds,
      balance.sparkSweetheartExtraWorkers,
    ),
  voltageVow: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.voltageVowBoostSeconds,
      balance.voltageVowExtraWorkers,
    ),
  magmaMuse: (context, { actions }) => actions.hireManagers(context.floors),
  moltenMogul: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, true),
      balance.moltenMogulTierSteps,
      balance.moltenMogulUpgrades,
    ),
  lavaLounger: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.lavaLoungerBoostSeconds,
      balance.lavaLoungerExtraWorkers,
    ),
  mossMaiden: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mossMaidenDiscount),
  blossomBashful: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blossomBashfulDiscount),
  bedrockBeauty: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bedrockBeautyBoostSeconds,
      balance.bedrockBeautyExtraWorkers,
    ),
  basaltBombshell: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.basaltBombshellDiscount),
  nuggetKnockout: (context, { balance, highestFloor, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      highestFloor(context),
      balance.nuggetKnockoutTierSteps,
      balance.nuggetKnockoutUpgrades,
    ),
  duneDarling: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.duneDarlingFloors),
  hourglassHeiress: (context, { actions, balance, hereAnd, selectByRate }) =>
    actions.payCycles(
      hereAnd(context, selectByRate(context, false)),
      balance.hourglassHeiressPayouts,
    ),
  sandsOfFortune: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sandsOfFortuneSeconds),
  vaporVogue: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, false)],
      balance.vaporVoguePayouts,
    ),
  teatimeTease: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.teatimeTeaseBoostSeconds,
      balance.teatimeTeaseExtraWorkers,
    ),
  earlGreyGlamour: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.earlGreyGlamourDiscount),
  tempestTiara: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.tempestTiaraBoostSeconds,
      balance.tempestTiaraExtraWorkers,
    ),
  starlightSwoon: (context, { actions, topLevel }) =>
    actions.raiseLevels(context.floors, topLevel(context)),
  stardustSigh: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.stardustSighFloors),
  umbraEnchantress: (context, { balance, lowestLevel, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      lowestLevel(context),
      balance.umbraEnchantressTierSteps,
      balance.umbraEnchantressUpgrades,
    ),
  nightfallNudge: (context, { actions, balance, hereAnd, lowestLevel }) =>
    actions.upgrade(
      hereAnd(context, lowestLevel(context)),
      balance.nightfallNudgeUpgrades,
    ),
  hoodedHush: (context, { actions, balance, hereAnd, lowestLevel }) =>
    actions.payCycles(
      hereAnd(context, lowestLevel(context)),
      balance.hoodedHushPayouts,
    ),
  smokescreenSmirk: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.smokescreenSmirkWorkers),
  ringletRascal: (context, { actions, balance, cheapest, hereAnd }) =>
    actions.upgrade(
      hereAnd(context, cheapest(context)),
      balance.ringletRascalUpgrades,
    ),
  ashenAllure: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.ashenAllureContinueChance),
  geodeCoquette: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.geodeCoquetteTierSteps,
      balance.geodeCoquetteUpgrades,
    ),
  amethystAllure: (context, { actions, alternating }) =>
    actions.hireManagers(alternating(context)),
  crystalCurtsy: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  prismPinup: (context, { actions, balance }) =>
    actions.hireWorkers(context.floors, balance.prismPinupWorkers),
  frostbiteFinesse: (context, { actions }) =>
    actions.giveOfficeChairs(context.floors),
  nebulaNocturne: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.nebulaNocturneContinueChance),
} satisfies FeaturedRewards<typeof ELEMENTAL_WOMEN_CRITS>;
