import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BAKERY_CRITS = {
  butterCroissant: {
    label: "Butter Croissant",
    color: COLOR.gold,
    image: "crits/bakery/butterCroissant.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.butterCroissantFloors),
  },
  almondEncore: {
    label: "Almond Encore",
    color: COLOR.amberMuted,
    image: "crits/bakery/almondEncore.webp",
    description: "Locks every floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent(context.floors, "spendingFreeze"),
  },
  babkaRhapsody: {
    label: "Babka Rhapsody",
    color: COLOR.chairGiveawayBrown,
    image: "crits/bakery/babkaRhapsody.webp",
    description: "Forty free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.babkaRhapsodyUpgrades),
  },
  bagelBoulevard: {
    label: "Bagel Boulevard",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/bakery/bagelBoulevard.webp",
    description:
      "Repeats the crit on the floor above, 55% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.bagelBoulevardContinueChance),
  },
  baguetteBaton: {
    label: "Baguette Baton",
    color: COLOR.supplyRunTan,
    image: "crits/bakery/baguetteBaton.webp",
    description: "Thirty-nine upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.baguetteBatonUpgrades),
  },
  briocheBonanza: {
    label: "Brioche Bonanza",
    color: COLOR.sunshineGold,
    image: "crits/bakery/briocheBonanza.webp",
    description: "Boosts every worker for 60s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.briocheBonanzaBoostSeconds,
        balance.briocheBonanzaExtraWorkers,
      ),
  },
  breadWinner: {
    label: "Bread Winner",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bakery/breadWinner.webp",
    description: "Cuts every price in this building by 10%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.breadWinnerDiscount),
  },
  challahCharm: {
    label: "Challah Charm",
    color: COLOR.amber,
    image: "crits/bakery/challahCharm.webp",
    description: "One tier promotion and twenty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.challahCharmTierSteps,
        balance.challahCharmUpgrades,
      ),
  },
  chouxBusiness: {
    label: "Choux Business",
    color: COLOR.red,
    image: "crits/bakery/chouxBusiness.webp",
    description: "Cuts every price in this building by 4.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.chouxBusinessDiscount),
  },
  cinnamonSpin: {
    label: "Cinnamon Spin",
    color: COLOR.headhunterRust,
    image: "crits/bakery/cinnamonSpin.webp",
    description:
      "Repeats the crit on the floor below, 55% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.cinnamonSpinContinueChance),
  },
  icingOnTheBun: {
    label: "Icing on the Bun",
    color: COLOR.teaBreakBrown,
    image: "crits/bakery/icingOnTheBun.webp",
    description: "Thirty-seven payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.icingOnTheBunPayouts),
  },
  cruffinSummit: {
    label: "Cruffin Summit",
    color: COLOR.fullHouseCrimson,
    image: "crits/bakery/cruffinSummit.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.cruffinSummitFloors),
  },
  custardCrown: {
    label: "Custard Crown",
    color: COLOR.goldenTicketYellow,
    image: "crits/bakery/custardCrown.webp",
    description: "Two tier promotions and twenty upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.custardCrownTierSteps,
        balance.custardCrownUpgrades,
      ),
  },
  danishDaydream: {
    label: "Danish Daydream",
    color: COLOR.grandOpeningRose,
    image: "crits/bakery/danishDaydream.webp",
    description: "Forty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.danishDaydreamPayouts),
  },
  eclairFlair: {
    label: "Eclair Flair",
    color: COLOR.peppermintPink,
    image: "crits/bakery/eclairFlair.webp",
    description: "Cuts every price in this building by 15%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.eclairFlairDiscount),
  },
  focacciaFiesta: {
    label: "Focaccia Fiesta",
    color: COLOR.payoutOlive,
    image: "crits/bakery/focacciaFiesta.webp",
    description: "One tier promotion and twelve upgrades on the lowest-level floor",
    reward: (context, { balance, promoteAndUpgrade, lowestLevel }) =>
      promoteAndUpgrade(lowestLevel(context), balance.focacciaFiestaTierSteps, balance.focacciaFiestaUpgrades),
  },
  jamSession: {
    label: "Jam Session",
    color: COLOR.redActive,
    image: "crits/bakery/jamSession.webp",
    description: "Thirty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.jamSessionPayouts),
  },
  sconeWithTheWind: {
    label: "Scone With the Wind",
    color: COLOR.springSalePink,
    image: "crits/bakery/sconeWithTheWind.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  knotYourAverage: {
    label: "Knot Your Average",
    color: COLOR.espressoShotBrown,
    image: "crits/bakery/knotYourAverage.webp",
    description: "Thirty-eight upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.knotYourAverageUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.knotYourAverageUpgrades);
    },
  },
  naanStop: {
    label: "Naan Stop",
    color: COLOR.luckyCloverGreen,
    image: "crits/bakery/naanStop.webp",
    description: "Forty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.naanStopPayouts),
  },
  palmierParade: {
    label: "Palmier Parade",
    color: COLOR.autumnSaleAmber,
    image: "crits/bakery/palmierParade.webp",
    description: "Forty-five upgrades marching down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.palmierParadeUpgrades),
  },
  pistachioPalace: {
    label: "Pistachio Palace",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/bakery/pistachioPalace.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.hireWorkers(context.floors, balance.pistachioPalaceWorkers);
      actions.hireManagers(context.floors);
    },
  },
  pitaPocketPayday: {
    label: "Pita Pocket Payday",
    color: COLOR.coinGold,
    image: "crits/bakery/pitaPocketPayday.webp",
    description: "Adds 39.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pitaPocketPaydayShare),
  },
  ryeOnThePrize: {
    label: "Rye on the Prize",
    color: COLOR.mysticTeal,
    image: "crits/bakery/ryeOnThePrize.webp",
    description: "Hires 1 free worker on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.hireWorkers(alternating(context), balance.ryeOnThePrizeWorkers),
  },
  shokupanCloud: {
    label: "Shokupan Cloud",
    color: COLOR.secondWindSky,
    image: "crits/bakery/shokupanCloud.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.shokupanCloudFloors),
  },
  sourdoughSunrise: {
    label: "Sourdough Sunrise",
    color: COLOR.summerSaleOrange,
    image: "crits/bakery/sourdoughSunrise.webp",
    description: "Forty payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles(
        [lowestLevel(context)],
        balance.sourdoughSunrisePayouts,
      ),
  },
  strudelCuddle: {
    label: "Strudel Cuddle",
    color: COLOR.roundUpOrange,
    image: "crits/bakery/strudelCuddle.webp",
    description: "Twenty-four upgrades and sixteen payouts on the lowest floor",
    reward: (context, { balance, lowestLevel, upgradeAndPay }) =>
      upgradeAndPay(
        [lowestLevel(context)],
        balance.strudelCuddleUpgrades,
        balance.strudelCuddlePayouts,
      ),
  },
  appleOfMyEye: {
    label: "Apple of My Eye",
    color: COLOR.fireDrillRed,
    image: "crits/bakery/appleOfMyEye.webp",
    description: "Forty-three payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.appleOfMyEyePayouts),
  },
  turnoverTreasure: {
    label: "Turnover Treasure",
    color: COLOR.bonusRoundGold,
    image: "crits/bakery/turnoverTreasure.webp",
    description: "Adds 67.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.turnoverTreasureShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
