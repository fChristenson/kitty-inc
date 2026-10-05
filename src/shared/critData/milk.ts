import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const MILK_CRITS = {
  calciumCapital: {
    label: "Calcium Capital",
    color: COLOR.overflowBlue,
    image: "crits/milk/calciumCapital.webp",
    description: "One tier promotion and nine upgrades here",
  },
  creamOfTheCrop: {
    label: "Cream Of The Crop",
    color: COLOR.chairGiveawayBrown,
    image: "crits/milk/creamOfTheCrop.webp",
    description: "Adds 5.4% of your total income",
  },
  dairyDividend: {
    label: "Dairy Dividend",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/milk/dairyDividend.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
  },
  gotMilk: {
    label: "Got Milk",
    color: COLOR.amber,
    image: "crits/milk/gotMilk.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  lactoseTycoon: {
    label: "Lactose Tycoon",
    color: COLOR.fastForwardBlue,
    image: "crits/milk/lactoseTycoon.webp",
    description: "Unlocks the next 5 floors for free",
  },
  milkMoney: {
    label: "Milk Money",
    color: COLOR.orange,
    image: "crits/milk/milkMoney.webp",
    description: "Cuts every price in this building by 1.1%",
  },
  milkshakeMogul: {
    label: "Milkshake Mogul",
    color: COLOR.overflowBlue,
    image: "crits/milk/milkshakeMogul.webp",
    description: "Boosts every worker for 20s",
  },
  mooJuice: {
    label: "Moo Juice",
    color: COLOR.amberMuted,
    image: "crits/milk/mooJuice.webp",
    description: "Free office chairs for this floor",
  },
  skimProfits: {
    label: "Skim Profits",
    color: COLOR.amberMuted,
    image: "crits/milk/skimProfits.webp",
    description: "Repeats the crit on the floor below, 17% chance to keep falling",
  },
  udderSuccess: {
    label: "Udder Success",
    color: COLOR.sameBoatCoral,
    image: "crits/milk/udderSuccess.webp",
    description: "One tier promotion and six upgrades here",
  },
  wholeMilkHustle: {
    label: "Whole Milk Hustle",
    color: COLOR.overflowBlue,
    image: "crits/milk/wholeMilkHustle.webp",
    description: "Adds 22s of your company's income",
  },
  bottleService: {
    label: "Bottle Service",
    color: COLOR.amberMuted,
    image: "crits/milk/bottleService.webp",
    description: "Repeats the crit on the floor below, 37% chance to keep falling",
  },
  creameryCredit: {
    label: "Creamery Credit",
    color: COLOR.doubleDownCrimson,
    image: "crits/milk/creameryCredit.webp",
    description: "One tier promotion and seven upgrades here",
  },
  milkRun: {
    label: "Milk Run",
    color: COLOR.red,
    image: "crits/milk/milkRun.webp",
    description: "Raises alternating floors to the building's top level",
  },
  pintSizedProfits: {
    label: "Pint Sized Profits",
    color: COLOR.redActive,
    image: "crits/milk/pintSizedProfits.webp",
    description: "Unlocks the next 2 floors for free",
  },
  milkMustacheDrake: {
    label: "Milk Mustache Drake",
    color: COLOR.springCleaningMint,
    image: "crits/milk/milkMustacheDrake.webp",
    description: "Adds 14.9% of your total income",
  },
  bottleChugWyvern: {
    label: "Bottle Chug Wyvern",
    color: COLOR.rainCheckBlue,
    image: "crits/milk/bottleChugWyvern.webp",
    description: "Boosts every worker for 134s, counting as 3 extra workers",
  },
  jadeGlassGuzzle: {
    label: "Jade Glass Guzzle",
    color: COLOR.moneyGreen,
    image: "crits/milk/jadeGlassGuzzle.webp",
    description: "Repeats the crit on the floor below, 85% chance to keep falling",
  },
  calciumCrusher: {
    label: "Calcium Crusher",
    color: COLOR.overflowBlue,
    image: "crits/milk/calciumCrusher.webp",
    description: "Cuts every price in this building by 18%",
  },
  glassHalfFull: {
    label: "Glass Half Full",
    color: COLOR.internSkyBlue,
    image: "crits/milk/glassHalfFull.webp",
    description: "Adds 46s of your company's income",
  },
} as const satisfies Record<string, FeaturedCritData>;
