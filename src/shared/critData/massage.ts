import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const MASSAGE_CRITS = {
  chromeFootRub: {
    label: "Chrome Foot Rub",
    color: COLOR.sameBoatCoral,
    image: "crits/massage/chromeFootRub.webp",
    description: "Cuts every price in this building by 16.8%",
  },
  silverSoleSoother: {
    label: "Silver Sole Soother",
    color: COLOR.overflowBlue,
    image: "crits/massage/silverSoleSoother.webp",
    description: "Adds 13.7% of your total income",
  },
  butterHoofRub: {
    label: "Butter Hoof Rub",
    color: COLOR.gold,
    image: "crits/massage/butterHoofRub.webp",
    description: "Boosts every worker for 121s, counting as 3 extra workers",
  },
  spottedSoleSession: {
    label: "Spotted Sole Session",
    color: COLOR.gold,
    image: "crits/massage/spottedSoleSession.webp",
    description: "Repeats the crit on the floor above, 80% chance to keep climbing",
  },
  calfCareRub: {
    label: "Calf Care Rub",
    color: COLOR.teal,
    image: "crits/massage/calfCareRub.webp",
    description: "Cuts every price in this building by 16.9%",
  },
  twinMooRubdown: {
    label: "Twin Moo Rubdown",
    color: COLOR.rainCheckBlue,
    image: "crits/massage/twinMooRubdown.webp",
    description: "Adds 13.9% of your total income",
  },
  overallHeiferRub: {
    label: "Overall Heifer Rub",
    color: COLOR.sameBoatCoral,
    image: "crits/massage/overallHeiferRub.webp",
    description: "Boosts every worker for 122s, counting as 3 extra workers",
  },
  hellfireHeelRub: {
    label: "Hellfire Heel Rub",
    color: COLOR.doubleDownCrimson,
    image: "crits/massage/hellfireHeelRub.webp",
    description: "Repeats the crit on the floor below, 80% chance to keep falling",
  },
  infernalInstep: {
    label: "Infernal Instep",
    color: COLOR.doubleDownCrimson,
    image: "crits/massage/infernalInstep.webp",
    description: "Cuts every price in this building by 17%",
  },
  brimstoneSoles: {
    label: "Brimstone Soles",
    color: COLOR.doubleDownCrimson,
    image: "crits/massage/brimstoneSoles.webp",
    description: "Adds 14% of your total income",
  },
  calfKnotRelief: {
    label: "Calf Knot Relief",
    color: COLOR.amberMuted,
    image: "crits/massage/calfKnotRelief.webp",
    description: "Boosts every worker for 123s, counting as 3 extra workers",
  },
  pressurePointPal: {
    label: "Pressure Point Pal",
    color: COLOR.summerSaleOrange,
    image: "crits/massage/pressurePointPal.webp",
    description: "Repeats the crit on the floor above, 81% chance to keep climbing",
  },
  archSupportSquad: {
    label: "Arch Support Squad",
    color: COLOR.summerSaleOrange,
    image: "crits/massage/archSupportSquad.webp",
    description: "Cuts every price in this building by 17.1%",
  },
  heelHoldHero: {
    label: "Heel Hold Hero",
    color: COLOR.amberMuted,
    image: "crits/massage/heelHoldHero.webp",
    description: "Adds 14.1% of your total income",
  },
  cozyToeKnead: {
    label: "Cozy Toe Knead",
    color: COLOR.sameBoatCoral,
    image: "crits/massage/cozyToeKnead.webp",
    description: "Boosts every worker for 124s, counting as 3 extra workers",
  },
  soleMateSession: {
    label: "Sole Mate Session",
    color: COLOR.teaBreakBrown,
    image: "crits/massage/soleMateSession.webp",
    description: "Repeats the crit on the floor below, 81% chance to keep falling",
  },
  blissfulFootRub: {
    label: "Blissful Foot Rub",
    color: COLOR.coinGold,
    image: "crits/massage/blissfulFootRub.webp",
    description: "Cuts every price in this building by 17.2%",
  },
  postWorkoutRub: {
    label: "Post Workout Rub",
    color: COLOR.teaBreakBrown,
    image: "crits/massage/postWorkoutRub.webp",
    description: "Adds 14.2% of your total income",
  },
  dragonfireFootRub: {
    label: "Dragonfire Foot Rub",
    color: COLOR.springCleaningMint,
    image: "crits/massage/dragonfireFootRub.webp",
    description: "Cuts every price in this building by 17.8%",
  },
  wyrmwoodRubdown: {
    label: "Wyrmwood Rubdown",
    color: COLOR.doubleDownCrimson,
    image: "crits/massage/wyrmwoodRubdown.webp",
    description: "Adds 14.8% of your total income",
  },
  emeraldArchPress: {
    label: "Emerald Arch Press",
    color: COLOR.paydayEmerald,
    image: "crits/massage/emeraldArchPress.webp",
    description: "Boosts every worker for 133s, counting as 3 extra workers",
  },
  twinFlameToeRub: {
    label: "Twin Flame Toe Rub",
    color: COLOR.coffeeRunTeal,
    image: "crits/massage/twinFlameToeRub.webp",
    description: "Repeats the crit on the floor above, 85% chance to keep climbing",
  },
  scaleboundSoles: {
    label: "Scalebound Soles",
    color: COLOR.fullHouseCrimson,
    image: "crits/massage/scaleboundSoles.webp",
    description: "Cuts every price in this building by 17.9%",
  },
} as const satisfies Record<string, FeaturedCritData>;
