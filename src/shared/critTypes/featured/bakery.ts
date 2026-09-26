import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BAKERY_CRITS = {
  butterCroissant: {
    label: "Butter Croissant",
    color: COLOR.gold,
    image: "crits/bakery/butterCroissant.png",
    description: "Thirty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.butterCroissantUpgrades),
  },
  almondEncore: {
    label: "Almond Encore",
    color: COLOR.amberMuted,
    image: "crits/bakery/almondEncore.png",
    description: "Thirty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.almondEncorePayouts),
  },
  babkaRhapsody: {
    label: "Babka Rhapsody",
    color: COLOR.chairGiveawayBrown,
    image: "crits/bakery/babkaRhapsody.png",
    description: "Forty free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.babkaRhapsodyUpgrades),
  },
  bagelBoulevard: {
    label: "Bagel Boulevard",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/bakery/bagelBoulevard.png",
    description: "Thirty-eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.bagelBoulevardPayouts),
  },
  baguetteBaton: {
    label: "Baguette Baton",
    color: COLOR.supplyRunTan,
    image: "crits/bakery/baguetteBaton.png",
    description: "Thirty-nine upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.baguetteBatonUpgrades),
  },
  briocheBonanza: {
    label: "Brioche Bonanza",
    color: COLOR.sunshineGold,
    image: "crits/bakery/briocheBonanza.png",
    description: "Forty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.briocheBonanzaUpgrades),
  },
  breadWinner: {
    label: "Bread Winner",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bakery/breadWinner.png",
    description: "Twenty-two upgrades and twenty payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.breadWinnerUpgrades,
        balance.breadWinnerPayouts,
      ),
  },
  challahCharm: {
    label: "Challah Charm",
    color: COLOR.amber,
    image: "crits/bakery/challahCharm.png",
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
    image: "crits/bakery/chouxBusiness.png",
    description: "Twenty upgrades and eighteen payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.chouxBusinessUpgrades,
        balance.chouxBusinessPayouts,
      ),
  },
  cinnamonSpin: {
    label: "Cinnamon Spin",
    color: COLOR.headhunterRust,
    image: "crits/bakery/cinnamonSpin.png",
    description: "Thirty upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) => {
      const lowest = lowestLevel(context);
      actions.upgrade([context.floor], balance.cinnamonSpinUpgrades);
      if (lowest !== context.floor)
        actions.upgrade([lowest], balance.cinnamonSpinUpgrades);
    },
  },
  icingOnTheBun: {
    label: "Icing on the Bun",
    color: COLOR.teaBreakBrown,
    image: "crits/bakery/icingOnTheBun.png",
    description: "Thirty-seven payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.icingOnTheBunPayouts),
  },
  cruffinSummit: {
    label: "Cruffin Summit",
    color: COLOR.fullHouseCrimson,
    image: "crits/bakery/cruffinSummit.png",
    description: "Forty-six upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.cruffinSummitUpgrades),
  },
  custardCrown: {
    label: "Custard Crown",
    color: COLOR.goldenTicketYellow,
    image: "crits/bakery/custardCrown.png",
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
    image: "crits/bakery/danishDaydream.png",
    description: "Forty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.danishDaydreamPayouts),
  },
  eclairFlair: {
    label: "Eclair Flair",
    color: COLOR.peppermintPink,
    image: "crits/bakery/eclairFlair.png",
    description: "Forty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.eclairFlairUpgrades),
  },
  focacciaFiesta: {
    label: "Focaccia Fiesta",
    color: COLOR.payoutOlive,
    image: "crits/bakery/focacciaFiesta.png",
    description: "Forty-two upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.focacciaFiestaUpgrades),
  },
  jamSession: {
    label: "Jam Session",
    color: COLOR.redActive,
    image: "crits/bakery/jamSession.png",
    description: "Thirty-five payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.jamSessionPayouts),
  },
  sconeWithTheWind: {
    label: "Scone With the Wind",
    color: COLOR.springSalePink,
    image: "crits/bakery/sconeWithTheWind.png",
    description: "Forty upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.sconeWithTheWindUpgrades),
  },
  knotYourAverage: {
    label: "Knot Your Average",
    color: COLOR.espressoShotBrown,
    image: "crits/bakery/knotYourAverage.png",
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
    image: "crits/bakery/naanStop.png",
    description: "Forty-four payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.naanStopPayouts),
  },
  palmierParade: {
    label: "Palmier Parade",
    color: COLOR.autumnSaleAmber,
    image: "crits/bakery/palmierParade.png",
    description: "Forty-five upgrades marching down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.palmierParadeUpgrades),
  },
  pistachioPalace: {
    label: "Pistachio Palace",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/bakery/pistachioPalace.png",
    description: "Forty-eight upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.pistachioPalaceUpgrades),
  },
  pitaPocketPayday: {
    label: "Pita Pocket Payday",
    color: COLOR.coinGold,
    image: "crits/bakery/pitaPocketPayday.png",
    description: "Forty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pitaPocketPaydayPayouts),
  },
  ryeOnThePrize: {
    label: "Rye on the Prize",
    color: COLOR.mysticTeal,
    image: "crits/bakery/ryeOnThePrize.png",
    description: "Thirty-nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.ryeOnThePrizePayouts,
      ),
  },
  shokupanCloud: {
    label: "Shokupan Cloud",
    color: COLOR.secondWindSky,
    image: "crits/bakery/shokupanCloud.png",
    description: "Thirty-eight upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.shokupanCloudUpgrades,
      ),
  },
  sourdoughSunrise: {
    label: "Sourdough Sunrise",
    color: COLOR.summerSaleOrange,
    image: "crits/bakery/sourdoughSunrise.png",
    description: "Forty payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.sourdoughSunrisePayouts),
  },
  strudelCuddle: {
    label: "Strudel Cuddle",
    color: COLOR.roundUpOrange,
    image: "crits/bakery/strudelCuddle.png",
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
    image: "crits/bakery/appleOfMyEye.png",
    description: "Forty-three payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.appleOfMyEyePayouts),
  },
  turnoverTreasure: {
    label: "Turnover Treasure",
    color: COLOR.bonusRoundGold,
    image: "crits/bakery/turnoverTreasure.png",
    description: "Forty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.turnoverTreasurePayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
