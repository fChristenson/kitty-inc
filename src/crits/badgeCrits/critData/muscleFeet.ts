import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const MUSCLE_FEET_CRITS = {
  soleMate: {
    label: "Sole Mate",
    color: COLOR.peppermintPink,
    image: "crits/muscleFeet/soleMate.webp",
    description: "Seventy-nine free upgrades on this floor",
  },
  toeTapper: {
    label: "Toe Tapper",
    color: COLOR.fastForwardBlue,
    image: "crits/muscleFeet/toeTapper.webp",
    description: "Seventy-nine instant payouts on this floor",
  },
  heelAppeal: {
    label: "Heel Appeal",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleFeet/heelAppeal.webp",
    description: "Raises every floor below this one to its level",
  },
  solePower: {
    label: "Sole Power",
    color: COLOR.spendingFreezeTeal,
    image: "crits/muscleFeet/solePower.webp",
    description: "Boosts every worker for 138s, counting as 3 extra workers",
  },
  tiptoeTitan: {
    label: "Tiptoe Titan",
    color: COLOR.grandOpeningRose,
    image: "crits/muscleFeet/tiptoeTitan.webp",
    description: "One tier promotion and fifty-seven upgrades here",
  },
  footloose: {
    label: "Footloose",
    color: COLOR.springSalePink,
    image: "crits/muscleFeet/footloose.webp",
    description: "Sixty-six payouts on alternating floors",
  },
  tenLittlePiggies: {
    label: "Ten Little Piggies",
    color: COLOR.headhunterRust,
    image: "crits/muscleFeet/tenLittlePiggies.webp",
    description: "Unlocks the next 2 floors for free",
  },
  pedicurePinup: {
    label: "Pedicure Pinup",
    color: COLOR.easterSalePink,
    image: "crits/muscleFeet/pedicurePinup.webp",
    description: "Cuts every price in this building by 4.9%",
  },
  wiggleRoom: {
    label: "Wiggle Room",
    color: COLOR.pairBlue,
    image: "crits/muscleFeet/wiggleRoom.webp",
    description: "Eighty-one instant payouts on this floor",
  },
  cozyToes: {
    label: "Cozy Toes",
    color: COLOR.royalFlushPurple,
    image: "crits/muscleFeet/cozyToes.webp",
    description: "Seventy-five payouts on the lowest-level floor",
  },
  barefootBoss: {
    label: "Barefoot Boss",
    color: COLOR.goldStandardAmber,
    image: "crits/muscleFeet/barefootBoss.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  bigFootEnergy: {
    label: "Big Foot Energy",
    color: COLOR.fancyFridayIndigo,
    image: "crits/muscleFeet/bigFootEnergy.webp",
    description: "Two tier promotions and twenty-one upgrades here",
  },
  tickleMePink: {
    label: "Tickle Me Pink",
    color: COLOR.springSalePink,
    image: "crits/muscleFeet/tickleMePink.webp",
    description: "Forty-five upgrades and forty-seven payouts on this floor",
  },
  galaTootsies: {
    label: "Gala Tootsies",
    color: COLOR.blue,
    image: "crits/muscleFeet/galaTootsies.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  redCarpetStomp: {
    label: "Red Carpet Stomp",
    color: COLOR.doubleDownCrimson,
    image: "crits/muscleFeet/redCarpetStomp.webp",
    description:
      "One tier promotion and fifty-nine upgrades on the lowest-earning floor",
  },
  putYourFeetUp: {
    label: "Put Your Feet Up",
    color: COLOR.cyan,
    image: "crits/muscleFeet/putYourFeetUp.webp",
    description:
      "Repeats the crit on the floor below, 61% chance to keep falling",
  },
  highTen: {
    label: "High Ten",
    color: COLOR.purple,
    image: "crits/muscleFeet/highTen.webp",
    description: "Cuts every price in this building by 5%",
  },
  toeTheLine: {
    label: "Toe the Line",
    color: COLOR.summerSaleOrange,
    image: "crits/muscleFeet/toeTheLine.webp",
    description: "Cuts every price in this building by 7.6%",
  },
  heelDrive: {
    label: "Heel Drive",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleFeet/heelDrive.webp",
    description:
      "Repeats the crit on the floor above, 10% chance to keep climbing",
  },
  plantarPower: {
    label: "Plantar Power",
    color: COLOR.amberMuted,
    image: "crits/muscleFeet/plantarPower.webp",
    description: "Cuts every price in this building by 1.2%",
  },
  tiptoeTreasury: {
    label: "Tiptoe Treasury",
    color: COLOR.amberMuted,
    image: "crits/muscleFeet/tiptoeTreasury.webp",
    description: "Arms every floor's next click as an x5 crit",
  },
  greenLeggingsGenuflect: {
    label: "Green Leggings Genuflect",
    color: COLOR.paydayEmerald,
    image: "crits/muscleFeet/greenLeggingsGenuflect.webp",
    description: "Spreads 34 free upgrades over this floor and the ones below",
  },
  pinkBootsPraise: {
    label: "Pink Boots Praise",
    color: COLOR.amberMuted,
    image: "crits/muscleFeet/pinkBootsPraise.webp",
    description: "Pays 61 times this floor's upgrade price in cash",
  },
  purpleLeggingsReverence: {
    label: "Purple Leggings Reverence",
    color: COLOR.teaBreakBrown,
    image: "crits/muscleFeet/purpleLeggingsReverence.webp",
    description: "Pays 62 times this floor's upgrade price in cash",
  },
  redLeggingsRapture: {
    label: "Red Leggings Rapture",
    color: COLOR.sameBoatCoral,
    image: "crits/muscleFeet/redLeggingsRapture.webp",
    description: "Pays 15 times every unlocked floor's upgrade price in cash",
  },
  matchingSneakers: {
    label: "Matching Sneakers",
    color: COLOR.amberMuted,
    image: "crits/muscleFeet/matchingSneakers.webp",
    description: "Spreads 154 free upgrades over the lowest-level floors",
  },
} as const satisfies Record<string, FeaturedCritData>;
