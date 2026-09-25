import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const GAMES_OF_CHANCE_CRIT_INFO = {
  bullseye: {
    label: "Bullseye",
    color: COLOR.fullHouseCrimson,
    icon: "bullseye",
    description: "Twenty-one free upgrades on the lowest-level floor",
  },
  chainReaction: {
    label: "Chain Reaction",
    color: COLOR.blue,
    icon: "chainReaction",
    description: "Sixteen upgrades on this floor and every floor below",
  },
  doubleHelix: {
    label: "Double Helix",
    color: COLOR.pairBlue,
    icon: "doubleHelix",
    description: "Fifteen upgrades on alternating floors",
  },
  eureka: {
    label: "Eureka",
    color: COLOR.luckyCloverGreen,
    icon: "eureka",
    description: "One tier promotion and eighteen upgrades here",
  },
  goldMedal: {
    label: "Gold Medal",
    color: COLOR.goldenTicketYellow,
    icon: "goldMedal",
    description: "Thirty-one instant payouts on this floor",
  },
  halfLife: {
    label: "Half Life",
    color: COLOR.suppliesGiveawayLime,
    icon: "halfLife",
    description: "Twenty-eight payouts on every unlocked floor",
  },
  highRoller: {
    // kind kept as-is on purpose: badge counts persist per kind (see
    // critProcCounts), so renaming it would hand this crit's collection to the
    // dice-table cat below, which now carries the "High Roller" name instead
    label: "Stacked Chips",
    color: COLOR.doubleDownCrimson,
    icon: "highRoller",
    description: "Twenty-eight payouts from the highest-earning floor",
  },
  jackpot: {
    label: "Jackpot",
    color: COLOR.bonusRoundGold,
    icon: "jackpot",
    description: "Thirty-two free upgrades on every unlocked floor",
  },
  knockout: {
    label: "Knockout",
    color: COLOR.red,
    icon: "knockout",
    description: "Thirty-four free upgrades on this floor",
  },
  pearlDiver: {
    label: "Pearl Diver",
    color: COLOR.peppermintPink,
    icon: "pearlDiver",
    description: "Twenty-seven payouts from the highest-earning floor",
  },
  roundAndRound: {
    label: "Round and Round",
    color: COLOR.grandOpeningRose,
    icon: "roundAndRound",
    description: "Twenty-three payouts on alternating floors",
  },
  scratchCard: {
    label: "Scratch Card",
    color: COLOR.internSkyBlue,
    icon: "scratchCard",
    description: "Thirty-two instant payouts on this floor",
  },
  silverware: {
    label: "Silverware",
    color: COLOR.silverTicketGray,
    icon: "silverware",
    description: "Twenty-nine upgrades on the highest unlocked floor",
  },
  snakeEyes: {
    label: "Snake Eyes",
    color: COLOR.white,
    icon: "snakeEyes",
    description: "Twenty payouts on the highest unlocked floor",
  },
  twentyOne: {
    label: "Twenty-One",
    color: COLOR.dressCodeGreen,
    icon: "twentyOne",
    description: "Seventeen upgrades on this floor and every floor below",
  },
  wheelOfFortune: {
    label: "Wheel of Fortune",
    color: COLOR.royalFlushPurple,
    icon: "wheelOfFortune",
    description: "Two tier promotions and thirteen upgrades here",
  },
  highRoller3: {
    label: "Hot Dice",
    color: COLOR.red,
    icon: "highRoller3",
    description: "Thirty-two instant payouts on this floor",
  },
  splitThePot: {
    label: "High Roller",
    color: COLOR.luckyCloverGreen,
    icon: "splitThePot",
    description: "Thirty-five upgrades here and on the highest floor",
  },
  highRoller2: {
    label: "Chip Leader",
    color: COLOR.royalFlushPurple,
    icon: "highRoller2",
    description: "Thirty-seven free upgrades on this floor",
  },
  pokerNight: {
    label: "Poker Night",
    color: COLOR.mysticTeal,
    icon: "pokerNight",
    description: "Thirty-nine instant payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
