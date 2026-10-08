import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const BIG_ATTITUDE_CRITS = {
  goldenSkull: {
    label: "Golden Skull",
    color: COLOR.gold,
    image: "crits/bigAttitude/goldenSkull.webp",
    description: "Adds 3.4% of your total income",
  },
  lordOfMurder: {
    label: "Lord of Murder",
    color: COLOR.red,
    image: "crits/bigAttitude/lordOfMurder.webp",
    description: "One tier promotion and 14 upgrades on the lowest-level floor",
  },
  speedDemon: {
    label: "Speed Demon",
    color: COLOR.cyan,
    image: "crits/bigAttitude/speedDemon.webp",
    description: "Boosts this floor's workers for 23s",
  },
  badonkadonk: {
    label: "Badonkadonk",
    color: COLOR.gold,
    image: "crits/bigAttitude/badonkadonk.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  demonicBuns: {
    label: "Demonic Buns",
    color: COLOR.red,
    image: "crits/bigAttitude/demonicBuns.webp",
    description: "Sixteen free upgrades, then twenty-one payouts on this floor",
  },
  infernalInterest: {
    label: "Infernal Wagon",
    color: COLOR.orange,
    image: "crits/bigAttitude/infernalInterest.webp",
    description: "Boosts this floor's workers for 26s",
  },
  dropItLow: {
    label: "Drop It Low",
    color: COLOR.cyan,
    image: "crits/bigAttitude/dropItLow.webp",
    description: "Nine upgrades, then five payouts on the lowest-level floor",
  },
  kittyWagon: {
    label: "Kitty Wagon",
    color: COLOR.moneyGreen,
    image: "crits/bigAttitude/kittyWagon.webp",
    description: "Hires 1 free worker on this floor",
  },
  madeYouLook: {
    label: "Made You Look",
    color: COLOR.peppermintPink,
    image: "crits/bigAttitude/madeYouLook.webp",
    description: "Boosts this floor's workers for 20s",
  },
  wagonWarrior: {
    label: "Wagon Warrior",
    color: COLOR.silverTicketGray,
    image: "crits/bigAttitude/wagonWarrior.webp",
    description: "Five upgrades, then three payouts on every unlocked floor",
  },
  bubbleButt: {
    label: "Bubble Butt",
    color: COLOR.orange,
    image: "crits/bigAttitude/bubbleButt.webp",
    description: "Boosts this floor's workers for 21s",
  },
  canNotLie: {
    label: "Can Not Lie",
    color: COLOR.moneyGreen,
    image: "crits/bigAttitude/canNotLie.webp",
    description: "Boosts this floor's workers for 22s",
  },
  demonGirl: {
    label: "Demon Girl",
    color: COLOR.fullHouseCrimson,
    image: "crits/bigAttitude/demonGirl.webp",
    description: "Cuts every price in this building by 4.5%",
  },
  partnersInCrime: {
    label: "Partners In Crime",
    color: COLOR.nightShiftIndigo,
    image: "crits/bigAttitude/partnersInCrime.webp",
    description: "Arms every floor's next click as an x5 crit",
  },
  abraCashDabra: {
    label: "Abra-Cash-Dabra",
    color: COLOR.moneyGreen,
    image: "crits/bigAttitude/abraCashDabra.webp",
    description: "Adds 6s of your company's income",
  },
  captainOfIndustry: {
    label: "Captain of Industry",
    color: COLOR.fastForwardBlue,
    image: "crits/bigAttitude/captainOfIndustry.webp",
    description: "Boosts this floor's workers for 23s",
  },
  clowningAround: {
    label: "Clowning Around",
    color: COLOR.summerSaleOrange,
    image: "crits/bigAttitude/clowningAround.webp",
    description: "Unlocks the next floor for free",
  },
  discoDividend: {
    label: "Disco Dividend",
    color: COLOR.silverTicketGray,
    image: "crits/bigAttitude/discoDividend.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  mimeYourBusiness: {
    label: "Mime Your Business",
    color: COLOR.winterSaleIceBlue,
    image: "crits/bigAttitude/mimeYourBusiness.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  redCarpetTreatment: {
    label: "Red Carpet Treatment",
    color: COLOR.fullHouseCrimson,
    image: "crits/bigAttitude/redCarpetTreatment.webp",
    description: "Twelve payouts from the highest-earning floor",
  },
  rockTheStock: {
    label: "Rock the Stock",
    color: COLOR.peppermintPink,
    image: "crits/bigAttitude/rockTheStock.webp",
    description: "Adds 3.3% of your total income",
  },
  strongReturn: {
    label: "Strong Return",
    color: COLOR.goldenHandshakeGold,
    image: "crits/bigAttitude/strongReturn.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  theBigCheese: {
    label: "The Big Cheese",
    color: COLOR.sunshineGold,
    image: "crits/bigAttitude/theBigCheese.webp",
    description: "Two tier promotions and thirty upgrades here",
  },
  queenOfQueens: {
    label: "Queen of Queens",
    color: COLOR.royalFlushPurple,
    image: "crits/bigAttitude/queenOfQueens.webp",
    description: "One tier promotion and 11 upgrades here",
  },
} as const satisfies Record<string, FeaturedCritData>;
