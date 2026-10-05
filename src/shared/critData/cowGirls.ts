import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const COW_GIRLS_CRITS = {
  bullRunBelle: {
    label: "Bull Run Belle",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/bullRunBelle.webp",
    description: "Arms every floor's next click as an x5 crit",
  },
  cowbellCashout: {
    label: "Cowbell Cashout",
    color: COLOR.headhunterRust,
    image: "crits/cowGirls/cowbellCashout.webp",
    description: "Hires 1 free worker on this floor",
  },
  grazingGains: {
    label: "Grazing Gains",
    color: COLOR.supplyRunTan,
    image: "crits/cowGirls/grazingGains.webp",
    description: "Repeats the crit on the floor below, 14% chance to keep falling",
  },
  herdMentality: {
    label: "Herd Mentality",
    color: COLOR.amber,
    image: "crits/cowGirls/herdMentality.webp",
    description: "One tier promotion and seven upgrades here",
  },
  moolahMaiden: {
    label: "Moolah Maiden",
    color: COLOR.springSalePink,
    image: "crits/cowGirls/moolahMaiden.webp",
    description: "Unlocks the next 2 floors for free",
  },
  pasturePrime: {
    label: "Pasture Prime",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/pasturePrime.webp",
    description: "Cuts every price in this building by 1%",
  },
  rodeoReturns: {
    label: "Rodeo Returns",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/rodeoReturns.webp",
    description: "Adds 43s of your company's income",
  },
  barnyardBullion: {
    label: "Barnyard Bullion",
    color: COLOR.overflowBlue,
    image: "crits/cowGirls/barnyardBullion.webp",
    description: "One tier promotion and eight upgrades here",
  },
  bovineBonus: {
    label: "Bovine Bonus",
    color: COLOR.teamBuildingCoral,
    image: "crits/cowGirls/bovineBonus.webp",
    description: "Cuts every price in this building by 1.3%",
  },
  butterBarons: {
    label: "Butter Barons",
    color: COLOR.teamBuildingCoral,
    image: "crits/cowGirls/butterBarons.webp",
    description: "Adds 5s of your company's income",
  },
  cattleCall: {
    label: "Cattle Call",
    color: COLOR.amberMuted,
    image: "crits/cowGirls/cattleCall.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  cudChewerCash: {
    label: "Cud Chewer Cash",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/cudChewerCash.webp",
    description: "Unlocks the next 5 floors for free",
  },
  heiferHedgeFund: {
    label: "Heifer Hedge Fund",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/heiferHedgeFund.webp",
    description: "Boosts every worker for 30s",
  },
  hornOfPlenty: {
    label: "Horn Of Plenty",
    color: COLOR.amberMuted,
    image: "crits/cowGirls/hornOfPlenty.webp",
    description: "Free office supplies for every unlocked floor",
  },
  lassoLoot: {
    label: "Lasso Loot",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cowGirls/lassoLoot.webp",
    description: "Repeats the crit on the floor above, 12% chance to keep climbing",
  },
  milkmaidMargin: {
    label: "Milkmaid Margin",
    color: COLOR.overflowBlue,
    image: "crits/cowGirls/milkmaidMargin.webp",
    description: "One tier promotion and nine upgrades here",
  },
  mooMentum: {
    label: "Moo Mentum",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/mooMentum.webp",
    description: "Cuts every price in this building by 1.4%",
  },
  prairiePayday: {
    label: "Prairie Payday",
    color: COLOR.teaBreakBrown,
    image: "crits/cowGirls/prairiePayday.webp",
    description: "Adds 10.1% of your total income",
  },
  spottedFortune: {
    label: "Spotted Fortune",
    color: COLOR.rainCheckBlue,
    image: "crits/cowGirls/spottedFortune.webp",
    description: "Raises alternating floors to the building's top level",
  },
  stampedeStocks: {
    label: "Stampede Stocks",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cowGirls/stampedeStocks.webp",
    description: "Unlocks the next 2 floors for free",
  },
  coneLick: {
    label: "Cone Lick",
    color: COLOR.fastForwardBlue,
    image: "crits/cowGirls/coneLick.webp",
    description: "Grows this floor's level by 26.3% in free upgrades",
  },
  softServeShare: {
    label: "Soft Serve Share",
    color: COLOR.nightOwlIndigo,
    image: "crits/cowGirls/softServeShare.webp",
    description: "Grows this floor's level by 26.4% in free upgrades",
  },
  strawberryScoop: {
    label: "Strawberry Scoop",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cowGirls/strawberryScoop.webp",
    description: "Grows this floor's level by 26.5% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
