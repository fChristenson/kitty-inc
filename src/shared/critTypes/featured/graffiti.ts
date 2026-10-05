import type { GRAFFITI_CRITS } from "../../critData/graffiti";
import type { FeaturedRewards } from "./types";

export const GRAFFITI_REWARDS = {
  alleyCatPiece: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.alleyCatPieceTierSteps, balance.alleyCatPieceUpgrades),
  sunsetSpray: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.sunsetSprayDiscount),
  palmDripSunset: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.palmDripSunsetShare),
  skylineSundown: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.skylineSundownBoostSeconds, balance.skylineSundownExtraWorkers),
  monsterMashup: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.monsterMashupContinueChance),
  slimeGrin: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.slimeGrinTierSteps, balance.slimeGrinUpgrades),
  toxicChomp: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.toxicChompDiscount),
  cosmicDrip: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cosmicDripShare),
  cometCrash: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.cometCrashBoostSeconds, balance.cometCrashExtraWorkers),
  orbitSplash: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.orbitSplashContinueChance),
  doodleBomb: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.doodleBombTierSteps, balance.doodleBombUpgrades),
  blueHoodKitty: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.blueHoodKittyDiscount),
  pixelHeartPad: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pixelHeartPadShare),
  thunderPad: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.thunderPadBoostSeconds, balance.thunderPadExtraWorkers),
  wildstyleGamepad: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.wildstyleGamepadContinueChance),
  streetCatSwagger: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(context.floor, balance.streetCatSwaggerTierSteps, balance.streetCatSwaggerUpgrades),
  gingerTagger: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.gingerTaggerDiscount),
  cheshireSpray: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.cheshireSprayShare),
  purpleProwlGrin: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.purpleProwlGrinBoostSeconds, balance.purpleProwlGrinExtraWorkers),
  aquaGrin: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.aquaGrinContinueChance),
  drippyHeart: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.drippyHeartDiscount),
  firewallFury: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.firewallFuryShare),
} satisfies FeaturedRewards<typeof GRAFFITI_CRITS>;
