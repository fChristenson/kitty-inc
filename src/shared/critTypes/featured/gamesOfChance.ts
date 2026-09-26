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
  aceUpTheSleeve: {
    label: "Ace Up the Sleeve",
    color: COLOR.pairBlue,
    icon: "aceUpTheSleeve",
    description: "One tier promotion and thirty-three upgrades here",
  },
  baccaratBaron: {
    label: "Baccarat Baron",
    color: COLOR.doubleDownCrimson,
    icon: "baccaratBaron",
    description: "Forty-nine payouts from the highest-earning floor",
  },
  betTheFarm: {
    label: "Bet the Farm",
    color: COLOR.fireDrillRed,
    icon: "betTheFarm",
    description: "Thirty-nine upgrades on every unlocked floor",
  },
  cardShark: {
    label: "Card Shark",
    color: COLOR.internSkyBlue,
    icon: "cardShark",
    description: "Twenty-four upgrades and twenty-six payouts on this floor",
  },
  casinoWhale: {
    label: "Casino Whale",
    color: COLOR.fastForwardBlue,
    icon: "casinoWhale",
    description: "One tier promotion and thirty upgrades on the top earner",
  },
  croupierSweep: {
    label: "Croupier Sweep",
    color: COLOR.chairGiveawayBrown,
    icon: "croupierSweep",
    description: "Forty-three upgrades on this floor and every floor below",
  },
  dealersChoice: {
    label: "Dealer's Choice",
    color: COLOR.dressCodeGreen,
    icon: "dealersChoice",
    description: "Forty-five upgrades on alternating floors",
  },
  feedTheKitty: {
    label: "Feed the Kitty",
    color: COLOR.autumnSaleAmber,
    icon: "feedTheKitty",
    description: "Forty-nine upgrades on the lowest-level floor",
  },
  bowlOfBets: {
    label: "Bowl of Bets",
    color: COLOR.blue,
    icon: "bowlOfBets",
    description: "Fifty-two instant payouts on this floor",
  },
  peekabooPot: {
    label: "Peekaboo Pot",
    color: COLOR.peppermintPink,
    icon: "peekabooPot",
    description: "Thirty-seven upgrades here and on the lowest-level floor",
  },
  headsOrTails: {
    label: "Heads or Tails",
    color: COLOR.goldenTicketYellow,
    icon: "headsOrTails",
    description: "Forty-seven payouts on alternating floors",
  },
  highSteaks: {
    label: "High Steaks",
    color: COLOR.espressoShotBrown,
    icon: "highSteaks",
    description: "Fifty-one upgrades on the highest unlocked floor",
  },
  lottoLlama: {
    label: "Lotto Llama",
    color: COLOR.grandOpeningRose,
    icon: "lottoLlama",
    description: "Fifty-three payouts on the highest unlocked floor",
  },
  mahjongMaestro: {
    label: "Mahjong Maestro",
    color: COLOR.fullHouseCrimson,
    icon: "mahjongMaestro",
    description: "Two tier promotions and twenty-one upgrades here",
  },
  neonStrip: {
    label: "Neon Strip",
    color: COLOR.royalFlushPurple,
    icon: "neonStrip",
    description: "Forty-eight upgrades rolling down the floors below",
  },
  oneArmedBandit: {
    label: "One-Armed Bandit",
    color: COLOR.red,
    icon: "oneArmedBandit",
    description: "Twenty-nine upgrades and thirty-one payouts on this floor",
  },
  slotStickup: {
    label: "Slot Stickup",
    color: COLOR.nightShiftIndigo,
    icon: "slotStickup",
    description: "Fifty-five payouts on the lowest-earning floor",
  },
  pachinkoPlunge: {
    label: "Pachinko Plunge",
    color: COLOR.mysticTeal,
    icon: "pachinkoPlunge",
    description: "Forty-four payouts on this floor and every floor below",
  },
  photoFinish: {
    label: "Photo Finish",
    color: COLOR.luckyCloverGreen,
    icon: "photoFinish",
    description: "Thirty-nine upgrades here and on the highest floor",
  },
  pitBoss: {
    label: "Pit Boss",
    color: COLOR.suppliesGiveawayLime,
    icon: "pitBoss",
    description: "Fifty-three upgrades on the cheapest floor to upgrade",
  },
  casinoBouncer: {
    label: "Casino Bouncer",
    color: COLOR.silverTicketGray,
    icon: "casinoBouncer",
    description: "Fifty-four free upgrades on this floor",
  },
  clipboardKingpin: {
    label: "Clipboard Kingpin",
    color: COLOR.goldStandardAmber,
    icon: "clipboardKingpin",
    description:
      "Eighteen upgrades and sixteen payouts on every unlocked floor",
  },
  earpieceEnforcer: {
    label: "Earpiece Enforcer",
    color: COLOR.amberMuted,
    icon: "earpieceEnforcer",
    description:
      "Twenty-six upgrades and thirty payouts on the highest unlocked floor",
  },
  pokerChipmunk: {
    label: "Poker Chipmunk",
    color: COLOR.bonusRoundGold,
    icon: "pokerChipmunk",
    description: "Fifty-seven payouts on the cheapest floor to upgrade",
  },
  pokerFace: {
    label: "Poker Face",
    color: COLOR.goldenHandshakeGold,
    icon: "pokerFace",
    description: "Fifty-six upgrades on the top earner",
  },
  stoneColdBluff: {
    label: "Stone-Cold Bluff",
    color: COLOR.white,
    icon: "stoneColdBluff",
    description:
      "Twenty-five upgrades and twenty-seven payouts on the top earner",
  },
  deadpanDeal: {
    label: "Deadpan Deal",
    color: COLOR.pairBlue,
    icon: "deadpanDeal",
    description: "Fifty-eight payouts on the lowest-level floor",
  },
  rouletteWhirl: {
    label: "Roulette Whirl",
    color: COLOR.fullHouseCrimson,
    icon: "rouletteWhirl",
    description: "Forty-three payouts on every unlocked floor",
  },
  showdown: {
    label: "Showdown",
    color: COLOR.dressCodeGreen,
    icon: "showdown",
    description: "Thirty-two upgrades here and on the lowest-earning floor",
  },
  highNoonHand: {
    label: "High Noon Hand",
    color: COLOR.autumnSaleAmber,
    icon: "highNoonHand",
    description: "Thirty-six payouts here and on the highest floor",
  },
  sicBoShaker: {
    label: "Sic Bo Shaker",
    color: COLOR.doubleDownCrimson,
    icon: "sicBoShaker",
    description:
      "Twenty-three upgrades and twenty-eight payouts on alternating floors",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
