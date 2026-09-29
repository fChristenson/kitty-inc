import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GRAFFITI_CRITS = {
  alleyCatPiece: {
    label: "Alley Cat Piece",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/alleyCatPiece.webp",
    description: "Two tier promotions and forty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.alleyCatPieceTierSteps, balance.alleyCatPieceUpgrades),
  },
  sunsetSpray: {
    label: "Sunset Spray",
    color: COLOR.sunshineGold,
    image: "crits/graffiti/sunsetSpray.webp",
    description: "Cuts every price in this building by 11.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.sunsetSprayDiscount),
  },
  palmDripSunset: {
    label: "Palm Drip Sunset",
    color: COLOR.grandOpeningRose,
    image: "crits/graffiti/palmDripSunset.webp",
    description: "Adds 10.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.palmDripSunsetShare),
  },
  skylineSundown: {
    label: "Skyline Sundown",
    color: COLOR.roundUpOrange,
    image: "crits/graffiti/skylineSundown.webp",
    description: "Boosts every worker for 64s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.skylineSundownBoostSeconds, balance.skylineSundownExtraWorkers),
  },
  monsterMashup: {
    label: "Monster Mashup",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/graffiti/monsterMashup.webp",
    description: "Repeats the crit on the floor below, 66% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.monsterMashupContinueChance),
  },
  slimeGrin: {
    label: "Slime Grin",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/graffiti/slimeGrin.webp",
    description: "Two tier promotions and forty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.slimeGrinTierSteps, balance.slimeGrinUpgrades),
  },
  toxicChomp: {
    label: "Toxic Chomp",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/graffiti/toxicChomp.webp",
    description: "Cuts every price in this building by 11.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.toxicChompDiscount),
  },
  cosmicDrip: {
    label: "Cosmic Drip",
    color: COLOR.fancyFridayIndigo,
    image: "crits/graffiti/cosmicDrip.webp",
    description: "Adds 10.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cosmicDripShare),
  },
  cometCrash: {
    label: "Comet Crash",
    color: COLOR.fancyFridayIndigo,
    image: "crits/graffiti/cometCrash.webp",
    description: "Boosts every worker for 65s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.cometCrashBoostSeconds, balance.cometCrashExtraWorkers),
  },
  orbitSplash: {
    label: "Orbit Splash",
    color: COLOR.fancyFridayIndigo,
    image: "crits/graffiti/orbitSplash.webp",
    description: "Repeats the crit on the floor above, 67% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.orbitSplashContinueChance),
  },
  doodleBomb: {
    label: "Doodle Bomb",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/doodleBomb.webp",
    description: "Two tier promotions and forty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.doodleBombTierSteps, balance.doodleBombUpgrades),
  },
  blueHoodKitty: {
    label: "Blue Hood Kitty",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/blueHoodKitty.webp",
    description: "Cuts every price in this building by 11.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.blueHoodKittyDiscount),
  },
  pixelHeartPad: {
    label: "Pixel Heart Pad",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/pixelHeartPad.webp",
    description: "Adds 11% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pixelHeartPadShare),
  },
  thunderPad: {
    label: "Thunder Pad",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/thunderPad.webp",
    description: "Boosts every worker for 66s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.thunderPadBoostSeconds, balance.thunderPadExtraWorkers),
  },
  wildstyleGamepad: {
    label: "Wildstyle Gamepad",
    color: COLOR.peppermintPink,
    image: "crits/graffiti/wildstyleGamepad.webp",
    description: "Repeats the crit on the floor below, 67% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.wildstyleGamepadContinueChance),
  },
  streetCatSwagger: {
    label: "Street Cat Swagger",
    color: COLOR.fastForwardBlue,
    image: "crits/graffiti/streetCatSwagger.webp",
    description: "Two tier promotions and forty-four upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(context.floor, balance.streetCatSwaggerTierSteps, balance.streetCatSwaggerUpgrades),
  },
  gingerTagger: {
    label: "Ginger Tagger",
    color: COLOR.orange,
    image: "crits/graffiti/gingerTagger.webp",
    description: "Cuts every price in this building by 11.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.gingerTaggerDiscount),
  },
  cheshireSpray: {
    label: "Cheshire Spray",
    color: COLOR.peppermintPink,
    image: "crits/graffiti/cheshireSpray.webp",
    description: "Adds 11.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.cheshireSprayShare),
  },
  purpleProwlGrin: {
    label: "Purple Prowl Grin",
    color: COLOR.royalFlushPurple,
    image: "crits/graffiti/purpleProwlGrin.webp",
    description: "Boosts every worker for 67s, counting as 1 extra worker",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.purpleProwlGrinBoostSeconds, balance.purpleProwlGrinExtraWorkers),
  },
  aquaGrin: {
    label: "Aqua Grin",
    color: COLOR.cyan,
    image: "crits/graffiti/aquaGrin.webp",
    description: "Repeats the crit on the floor above, 68% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.aquaGrinContinueChance),
  },
  drippyHeart: {
    label: "Drippy Heart",
    color: COLOR.red,
    image: "crits/graffiti/drippyHeart.webp",
    description: "Cuts every price in this building by 11.9%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.drippyHeartDiscount),
  },
  firewallFury: {
    label: "Firewall Fury",
    color: COLOR.nightShiftIndigo,
    image: "crits/graffiti/firewallFury.webp",
    description: "Adds 11.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.firewallFuryShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
