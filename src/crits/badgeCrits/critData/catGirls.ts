import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const CAT_GIRLS_CRITS = {
  pawsAndEffect: {
    label: "Paws and Effect",
    color: COLOR.peppermintPink,
    image: "crits/catGirls/pawsAndEffect.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  catwalkQueen: {
    label: "Catwalk Queen",
    color: COLOR.bonusRoundGold,
    image: "crits/catGirls/catwalkQueen.webp",
    description: "Two tier promotions and twenty-five upgrades here",
  },
  runwayRoyalty: {
    label: "Runway Royalty",
    color: COLOR.goldenTicketYellow,
    image: "crits/catGirls/runwayRoyalty.webp",
    description: "Two tier promotions and 10 upgrades here",
  },
  blueHourStrut: {
    label: "Blue Hour Strut",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/blueHourStrut.webp",
    description: "Cuts every price in this building by 10.4%",
  },
  felineFine: {
    label: "Feline Fine",
    color: COLOR.autumnSaleAmber,
    image: "crits/catGirls/felineFine.webp",
    description: "Sixty-four upgrades on the lowest-level floor",
  },
  kittenHeels: {
    label: "Kitten Heels",
    color: COLOR.grandOpeningRose,
    image: "crits/catGirls/kittenHeels.webp",
    description: "Arms every floor's next click as an x5 crit",
  },
  catsPajamas: {
    label: "Cat's Pajamas",
    color: COLOR.internSkyBlue,
    image: "crits/catGirls/catsPajamas.webp",
    description: "Unlocks the next 5 floors for free",
  },
  bedtimeBonus: {
    label: "Bedtime Bonus",
    color: COLOR.pairBlue,
    image: "crits/catGirls/bedtimeBonus.webp",
    description:
      "Twenty-seven upgrades and thirty-one payouts on alternating floors",
  },
  purrsuasion: {
    label: "Purrsuasion",
    color: COLOR.silverTicketGray,
    image: "crits/catGirls/purrsuasion.webp",
    description: "Unlocks the next floor for free",
  },
  coinBoop: {
    label: "Coin Boop",
    color: COLOR.goldStandardAmber,
    image: "crits/catGirls/coinBoop.webp",
    description: "Adds 13.1% of your total income",
  },
  topCat: {
    label: "Top Cat",
    color: COLOR.overflowBlue,
    image: "crits/catGirls/topCat.webp",
    description: "Hires 1 free worker on alternating floors",
  },
  clawContract: {
    label: "Claw Contract",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/clawContract.webp",
    description: "Repeats the crit on the floor below, 12% chance to keep falling",
  },
  kittenKaboodle: {
    label: "Kitten Kaboodle",
    color: COLOR.amberMuted,
    image: "crits/catGirls/kittenKaboodle.webp",
    description: "One tier promotion and six upgrades here",
  },
  meowtivation: {
    label: "Meowtivation",
    color: COLOR.coinGold,
    image: "crits/catGirls/meowtivation.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  nineLivesLedger: {
    label: "Nine Lives Ledger",
    color: COLOR.sameBoatCoral,
    image: "crits/catGirls/nineLivesLedger.webp",
    description: "Unlocks the next 5 floors for free",
  },
  purrfectPose: {
    label: "Purrfect Pose",
    color: COLOR.amberMuted,
    image: "crits/catGirls/purrfectPose.webp",
    description: "Cuts every price in this building by 1%",
  },
  tailSpinTycoon: {
    label: "Tail Spin Tycoon",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/tailSpinTycoon.webp",
    description: "Adds 42s of your company's income",
  },
  whiskerWink: {
    label: "Whisker Wink",
    color: COLOR.summerSaleOrange,
    image: "crits/catGirls/whiskerWink.webp",
    description: "Repeats the crit above and below, 65% chance to keep spreading",
  },
  primaryPaws: {
    label: "Primary Paws",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/primaryPaws.webp",
    description: "Grows this floor's level by 25.1% in free upgrades",
  },
  snowyAndSandy: {
    label: "Snowy And Sandy",
    color: COLOR.amberMuted,
    image: "crits/catGirls/snowyAndSandy.webp",
    description: "Grows this floor's level by 25.2% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
