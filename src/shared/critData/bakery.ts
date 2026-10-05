import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const BAKERY_CRITS = {
  butterCroissant: {
    label: "Butter Croissant",
    color: COLOR.gold,
    image: "crits/bakery/butterCroissant.webp",
    description: "Unlocks the next floor for free",
  },
  almondEncore: {
    label: "Almond Encore",
    color: COLOR.amberMuted,
    image: "crits/bakery/almondEncore.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  babkaRhapsody: {
    label: "Babka Rhapsody",
    color: COLOR.chairGiveawayBrown,
    image: "crits/bakery/babkaRhapsody.webp",
    description: "Forty free upgrades on alternating floors",
  },
  bagelBoulevard: {
    label: "Bagel Boulevard",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/bakery/bagelBoulevard.webp",
    description:
      "Repeats the crit on the floor above, 55% chance to keep climbing",
  },
  baguetteBaton: {
    label: "Baguette Baton",
    color: COLOR.supplyRunTan,
    image: "crits/bakery/baguetteBaton.webp",
    description: "Thirty-nine upgrades on the lowest-level floor",
  },
  briocheBonanza: {
    label: "Brioche Bonanza",
    color: COLOR.sunshineGold,
    image: "crits/bakery/briocheBonanza.webp",
    description: "Boosts every worker for 60s, counting as 2 extra workers",
  },
  breadWinner: {
    label: "Bread Winner",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bakery/breadWinner.webp",
    description: "Cuts every price in this building by 10%",
  },
  challahCharm: {
    label: "Challah Charm",
    color: COLOR.amber,
    image: "crits/bakery/challahCharm.webp",
    description: "One tier promotion and twenty-two upgrades here",
  },
  chouxBusiness: {
    label: "Choux Business",
    color: COLOR.red,
    image: "crits/bakery/chouxBusiness.webp",
    description: "Cuts every price in this building by 4.1%",
  },
  cinnamonSpin: {
    label: "Cinnamon Spin",
    color: COLOR.headhunterRust,
    image: "crits/bakery/cinnamonSpin.webp",
    description:
      "Repeats the crit on the floor below, 55% chance to keep falling",
  },
  icingOnTheBun: {
    label: "Icing on the Bun",
    color: COLOR.teaBreakBrown,
    image: "crits/bakery/icingOnTheBun.webp",
    description: "Thirty-seven payouts on alternating floors",
  },
  cruffinSummit: {
    label: "Cruffin Summit",
    color: COLOR.fullHouseCrimson,
    image: "crits/bakery/cruffinSummit.webp",
    description: "Unlocks the next 3 floors for free",
  },
  custardCrown: {
    label: "Custard Crown",
    color: COLOR.goldenTicketYellow,
    image: "crits/bakery/custardCrown.webp",
    description: "Two tier promotions and twenty upgrades here",
  },
  danishDaydream: {
    label: "Danish Daydream",
    color: COLOR.grandOpeningRose,
    image: "crits/bakery/danishDaydream.webp",
    description: "Forty-three instant payouts on this floor",
  },
  eclairFlair: {
    label: "Eclair Flair",
    color: COLOR.peppermintPink,
    image: "crits/bakery/eclairFlair.webp",
    description: "Cuts every price in this building by 15%",
  },
  focacciaFiesta: {
    label: "Focaccia Fiesta",
    color: COLOR.payoutOlive,
    image: "crits/bakery/focacciaFiesta.webp",
    description: "One tier promotion and twelve upgrades on the lowest-level floor",
  },
  jamSession: {
    label: "Jam Session",
    color: COLOR.redActive,
    image: "crits/bakery/jamSession.webp",
    description: "Thirty-five payouts on every unlocked floor",
  },
  sconeWithTheWind: {
    label: "Scone With the Wind",
    color: COLOR.springSalePink,
    image: "crits/bakery/sconeWithTheWind.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  knotYourAverage: {
    label: "Knot Your Average",
    color: COLOR.espressoShotBrown,
    image: "crits/bakery/knotYourAverage.webp",
    description: "Thirty-eight upgrades here and on the highest floor",
  },
  naanStop: {
    label: "Naan Stop",
    color: COLOR.luckyCloverGreen,
    image: "crits/bakery/naanStop.webp",
    description: "Forty-four payouts on every unlocked floor",
  },
  palmierParade: {
    label: "Palmier Parade",
    color: COLOR.autumnSaleAmber,
    image: "crits/bakery/palmierParade.webp",
    description: "Forty-five upgrades marching down the floors below",
  },
  pistachioPalace: {
    label: "Pistachio Palace",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/bakery/pistachioPalace.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
  },
  pitaPocketPayday: {
    label: "Pita Pocket Payday",
    color: COLOR.coinGold,
    image: "crits/bakery/pitaPocketPayday.webp",
    description: "Adds 39.2% of your total income",
  },
  ryeOnThePrize: {
    label: "Rye on the Prize",
    color: COLOR.mysticTeal,
    image: "crits/bakery/ryeOnThePrize.webp",
    description: "Hires 1 free worker on alternating floors",
  },
  shokupanCloud: {
    label: "Shokupan Cloud",
    color: COLOR.secondWindSky,
    image: "crits/bakery/shokupanCloud.webp",
    description: "Unlocks the next floor for free",
  },
  sourdoughSunrise: {
    label: "Sourdough Sunrise",
    color: COLOR.summerSaleOrange,
    image: "crits/bakery/sourdoughSunrise.webp",
    description: "Forty payouts on the lowest-level floor",
  },
  strudelCuddle: {
    label: "Strudel Cuddle",
    color: COLOR.roundUpOrange,
    image: "crits/bakery/strudelCuddle.webp",
    description: "Twenty-four upgrades and sixteen payouts on the lowest floor",
  },
  appleOfMyEye: {
    label: "Apple of My Eye",
    color: COLOR.fireDrillRed,
    image: "crits/bakery/appleOfMyEye.webp",
    description: "Forty-three payouts on alternating floors",
  },
  turnoverTreasure: {
    label: "Turnover Treasure",
    color: COLOR.bonusRoundGold,
    image: "crits/bakery/turnoverTreasure.webp",
    description: "Adds 67.5% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
