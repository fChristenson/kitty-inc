import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GAMES_OF_CHANCE_CRITS = {
  bullseye: {
    label: "Bullseye",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/bullseye.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  chainReaction: {
    label: "Chain Reaction",
    color: COLOR.blue,
    image: "crits/gamesOfChance/chainReaction.webp",
    description:
      "Repeats the crit on the floor below, 26% chance to keep falling",
  },
  doubleHelix: {
    label: "Double Helix",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/doubleHelix.webp",
    description:
      "Repeats the crit on the floor above, 25% chance to keep climbing",
  },
  eureka: {
    label: "Eureka",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/eureka.webp",
    description: "One tier promotion and eighteen upgrades here",
  },
  goldMedal: {
    label: "Gold Medal",
    color: COLOR.goldenTicketYellow,
    image: "crits/gamesOfChance/goldMedal.webp",
    description: "Adds 5.9% of your total income",
  },
  halfLife: {
    label: "Half Life",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gamesOfChance/halfLife.webp",
    description: "Twenty-eight payouts on every unlocked floor",
  },
  highRoller: {
    // kind kept as-is on purpose: badge counts persist per kind (see
    // critProcCounts), so renaming it would hand this crit's collection to the
    // dice-table cat below, which now carries the "High Roller" name instead
    label: "Stacked Chips",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/highRoller.webp",
    description: "Twenty-eight payouts from the highest-earning floor",
  },
  jackpot: {
    label: "Jackpot",
    color: COLOR.bonusRoundGold,
    image: "crits/gamesOfChance/jackpot.webp",
    description: "Adds 14s of your company's income",
  },
  knockout: {
    label: "Knockout",
    color: COLOR.red,
    image: "crits/gamesOfChance/knockout.webp",
    description: "Thirty-four free upgrades on this floor",
  },
  pearlDiver: {
    label: "Pearl Diver",
    color: COLOR.peppermintPink,
    image: "crits/gamesOfChance/pearlDiver.webp",
    description: "Adds 6.1% of your total income",
  },
  roundAndRound: {
    label: "Round and Round",
    color: COLOR.grandOpeningRose,
    image: "crits/gamesOfChance/roundAndRound.webp",
    description: "Twenty-three payouts on alternating floors",
  },
  scratchCard: {
    label: "Scratch Card",
    color: COLOR.internSkyBlue,
    image: "crits/gamesOfChance/scratchCard.webp",
    description: "Cuts every price in this building by 2.2%",
  },
  silverware: {
    label: "Silverware",
    color: COLOR.silverTicketGray,
    image: "crits/gamesOfChance/silverware.webp",
    description: "Twenty-nine upgrades on the highest unlocked floor",
  },
  snakeEyes: {
    label: "Snake Eyes",
    color: COLOR.white,
    image: "crits/gamesOfChance/snakeEyes.webp",
    description: "Twenty payouts on the highest unlocked floor",
  },
  twentyOne: {
    label: "Twenty-One",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/twentyOne.webp",
    description: "Adds 20.4% of your total income",
  },
  wheelOfFortune: {
    label: "Wheel of Fortune",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/wheelOfFortune.webp",
    description: "Two tier promotions and thirteen upgrades here",
  },
  highRoller3: {
    label: "Hot Dice",
    color: COLOR.red,
    image: "crits/gamesOfChance/highRoller3.webp",
    description: "Cuts every price in this building by 2.9%",
  },
  splitThePot: {
    label: "High Roller",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/splitThePot.webp",
    description:
      "Repeats the crit on the floor below, 36% chance to keep falling",
  },
  highRoller2: {
    label: "Chip Leader",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/highRoller2.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  pokerNight: {
    label: "Poker Night",
    color: COLOR.mysticTeal,
    image: "crits/gamesOfChance/pokerNight.webp",
    description: "Thirty-nine instant payouts on every unlocked floor",
  },
  aceUpTheSleeve: {
    label: "Ace Up the Sleeve",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/aceUpTheSleeve.webp",
    description: "One tier promotion and thirty-three upgrades here",
  },
  baccaratBaron: {
    label: "Baccarat Baron",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/baccaratBaron.webp",
    description: "Forty-nine payouts from the highest-earning floor",
  },
  betTheFarm: {
    label: "Bet the Farm",
    color: COLOR.fireDrillRed,
    image: "crits/gamesOfChance/betTheFarm.webp",
    description: "Unlocks the next 3 floors for free",
  },
  cardShark: {
    label: "Card Shark",
    color: COLOR.internSkyBlue,
    image: "crits/gamesOfChance/cardShark.webp",
    description: "Unlocks the next floor for free",
  },
  casinoWhale: {
    label: "Casino Whale",
    color: COLOR.fastForwardBlue,
    image: "crits/gamesOfChance/casinoWhale.webp",
    description: "One tier promotion and thirty upgrades on the top earner",
  },
  croupierSweep: {
    label: "Croupier Sweep",
    color: COLOR.chairGiveawayBrown,
    image: "crits/gamesOfChance/croupierSweep.webp",
    description: "Hires a free manager on alternating floors",
  },
  dealersChoice: {
    label: "Dealer's Choice",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/dealersChoice.webp",
    description: "Cuts every price in this building by 6.9%",
  },
  feedTheKitty: {
    label: "Feed the Kitty",
    color: COLOR.autumnSaleAmber,
    image: "crits/gamesOfChance/feedTheKitty.webp",
    description: "Unlocks the next 3 floors for free",
  },
  bowlOfBets: {
    label: "Bowl of Bets",
    color: COLOR.blue,
    image: "crits/gamesOfChance/bowlOfBets.webp",
    description: "Fifty-two instant payouts on this floor",
  },
  peekabooPot: {
    label: "Peekaboo Pot",
    color: COLOR.peppermintPink,
    image: "crits/gamesOfChance/peekabooPot.webp",
    description: "Thirty-seven upgrades here and on the lowest-level floor",
  },
  headsOrTails: {
    label: "Heads or Tails",
    color: COLOR.goldenTicketYellow,
    image: "crits/gamesOfChance/headsOrTails.webp",
    description: "Forty-seven payouts on alternating floors",
  },
  highSteaks: {
    label: "High Steaks",
    color: COLOR.espressoShotBrown,
    image: "crits/gamesOfChance/highSteaks.webp",
    description:
      "Repeats the crit on the floor above, 76% chance to keep climbing",
  },
  lottoLlama: {
    label: "Lotto Llama",
    color: COLOR.grandOpeningRose,
    image: "crits/gamesOfChance/lottoLlama.webp",
    description: "Unlocks the next 3 floors for free",
  },
  mahjongMaestro: {
    label: "Mahjong Maestro",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/mahjongMaestro.webp",
    description: "Two tier promotions and twenty-one upgrades here",
  },
  neonStrip: {
    label: "Neon Strip",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/neonStrip.webp",
    description: "Forty-eight upgrades rolling down the floors below",
  },
  oneArmedBandit: {
    label: "One-Armed Bandit",
    color: COLOR.red,
    image: "crits/gamesOfChance/oneArmedBandit.webp",
    description: "Twenty-nine upgrades and thirty-one payouts on this floor",
  },
  slotStickup: {
    label: "Slot Stickup",
    color: COLOR.nightShiftIndigo,
    image: "crits/gamesOfChance/slotStickup.webp",
    description: "Fifty-five payouts on the lowest-earning floor",
  },
  pachinkoPlunge: {
    label: "Pachinko Plunge",
    color: COLOR.mysticTeal,
    image: "crits/gamesOfChance/pachinkoPlunge.webp",
    description: "Cuts every price in this building by 11.1%",
  },
  photoFinish: {
    label: "Photo Finish",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/photoFinish.webp",
    description: "Thirty-nine upgrades here and on the highest floor",
  },
  pitBoss: {
    label: "Pit Boss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gamesOfChance/pitBoss.webp",
    description:
      "Repeats the crit above and below, 48% chance to keep spreading",
  },
  casinoBouncer: {
    label: "Casino Bouncer",
    color: COLOR.silverTicketGray,
    image: "crits/gamesOfChance/casinoBouncer.webp",
    description:
      "Repeats the crit on the floor below, 56% chance to keep falling",
  },
  clipboardKingpin: {
    label: "Clipboard Kingpin",
    color: COLOR.goldStandardAmber,
    image: "crits/gamesOfChance/clipboardKingpin.webp",
    description:
      "Repeats the crit above and below, 88% chance to keep spreading",
  },
  earpieceEnforcer: {
    label: "Earpiece Enforcer",
    color: COLOR.amberMuted,
    image: "crits/gamesOfChance/earpieceEnforcer.webp",
    description: "Raises every floor below this one to its level",
  },
  pokerChipmunk: {
    label: "Poker Chipmunk",
    color: COLOR.bonusRoundGold,
    image: "crits/gamesOfChance/pokerChipmunk.webp",
    description: "Unlocks the next floor for free",
  },
  pokerFace: {
    label: "Poker Face",
    color: COLOR.goldenHandshakeGold,
    image: "crits/gamesOfChance/pokerFace.webp",
    description: "Boosts every worker for 62s, counting as 2 extra workers",
  },
  stoneColdBluff: {
    label: "Stone-Cold Bluff",
    color: COLOR.white,
    image: "crits/gamesOfChance/stoneColdBluff.webp",
    description: "Raises every floor below this one to its level",
  },
  deadpanDeal: {
    label: "Deadpan Deal",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/deadpanDeal.webp",
    description: "Cuts every price in this building by 4.7%",
  },
  rouletteWhirl: {
    label: "Roulette Whirl",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/rouletteWhirl.webp",
    description:
      "Repeats the crit above and below, 80% chance to keep spreading",
  },
  showdown: {
    label: "Showdown",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/showdown.webp",
    description: "Hires 1 free worker on alternating floors",
  },
  highNoonHand: {
    label: "High Noon Hand",
    color: COLOR.autumnSaleAmber,
    image: "crits/gamesOfChance/highNoonHand.webp",
    description: "Thirty-six payouts here and on the highest floor",
  },
  sicBoShaker: {
    label: "Sic Bo Shaker",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/sicBoShaker.webp",
    description: "Raises every floor below this one to its level",
  },
} as const satisfies Record<string, FeaturedCritData>;
