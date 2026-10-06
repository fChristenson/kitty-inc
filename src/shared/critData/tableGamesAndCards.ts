import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const TABLE_GAMES_AND_CARDS_CRITS = {
  highRoller: {
    // kind kept as-is on purpose: badge counts persist per kind (see
    // critProcCounts), so renaming it would hand this crit's collection to the
    // dice-table cat below, which now carries the "High Roller" name instead
    label: "Stacked Chips",
    color: COLOR.doubleDownCrimson,
    image: "crits/tableGamesAndCards/highRoller.webp",
    description: "Twenty-eight payouts from the highest-earning floor",
  },
  snakeEyes: {
    label: "Snake Eyes",
    color: COLOR.white,
    image: "crits/tableGamesAndCards/snakeEyes.webp",
    description: "Twenty payouts on the highest unlocked floor",
  },
  twentyOne: {
    label: "Twenty-One",
    color: COLOR.dressCodeGreen,
    image: "crits/tableGamesAndCards/twentyOne.webp",
    description: "Adds 20.4% of your total income",
  },
  highRoller3: {
    label: "Hot Dice",
    color: COLOR.red,
    image: "crits/tableGamesAndCards/highRoller3.webp",
    description: "Cuts every price in this building by 2.9%",
  },
  splitThePot: {
    label: "High Roller",
    color: COLOR.luckyCloverGreen,
    image: "crits/tableGamesAndCards/splitThePot.webp",
    description:
      "Repeats the crit on the floor below, 36% chance to keep falling",
  },
  highRoller2: {
    label: "Chip Leader",
    color: COLOR.royalFlushPurple,
    image: "crits/tableGamesAndCards/highRoller2.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  pokerNight: {
    label: "Poker Night",
    color: COLOR.mysticTeal,
    image: "crits/tableGamesAndCards/pokerNight.webp",
    description: "Thirty-nine instant payouts on every unlocked floor",
  },
  aceUpTheSleeve: {
    label: "Ace Up the Sleeve",
    color: COLOR.pairBlue,
    image: "crits/tableGamesAndCards/aceUpTheSleeve.webp",
    description: "One tier promotion and thirty-three upgrades here",
  },
  baccaratBaron: {
    label: "Baccarat Baron",
    color: COLOR.doubleDownCrimson,
    image: "crits/tableGamesAndCards/baccaratBaron.webp",
    description: "Forty-nine payouts from the highest-earning floor",
  },
  cardShark: {
    label: "Card Shark",
    color: COLOR.internSkyBlue,
    image: "crits/tableGamesAndCards/cardShark.webp",
    description: "Unlocks the next floor for free",
  },
  casinoWhale: {
    label: "Casino Whale",
    color: COLOR.fastForwardBlue,
    image: "crits/tableGamesAndCards/casinoWhale.webp",
    description: "One tier promotion and thirty upgrades on the top earner",
  },
  croupierSweep: {
    label: "Croupier Sweep",
    color: COLOR.chairGiveawayBrown,
    image: "crits/tableGamesAndCards/croupierSweep.webp",
    description: "Hires a free manager on alternating floors",
  },
  dealersChoice: {
    label: "Dealer's Choice",
    color: COLOR.dressCodeGreen,
    image: "crits/tableGamesAndCards/dealersChoice.webp",
    description: "Cuts every price in this building by 6.9%",
  },
  mahjongMaestro: {
    label: "Mahjong Maestro",
    color: COLOR.fullHouseCrimson,
    image: "crits/tableGamesAndCards/mahjongMaestro.webp",
    description: "Two tier promotions and twenty-one upgrades here",
  },
  pitBoss: {
    label: "Pit Boss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/tableGamesAndCards/pitBoss.webp",
    description:
      "Repeats the crit above and below, 48% chance to keep spreading",
  },
  pokerChipmunk: {
    label: "Poker Chipmunk",
    color: COLOR.bonusRoundGold,
    image: "crits/tableGamesAndCards/pokerChipmunk.webp",
    description: "Unlocks the next floor for free",
  },
  pokerFace: {
    label: "Poker Face",
    color: COLOR.goldenHandshakeGold,
    image: "crits/tableGamesAndCards/pokerFace.webp",
    description: "Boosts every worker for 62s, counting as 2 extra workers",
  },
  stoneColdBluff: {
    label: "Stone-Cold Bluff",
    color: COLOR.white,
    image: "crits/tableGamesAndCards/stoneColdBluff.webp",
    description: "Raises every floor below this one to its level",
  },
  deadpanDeal: {
    label: "Deadpan Deal",
    color: COLOR.pairBlue,
    image: "crits/tableGamesAndCards/deadpanDeal.webp",
    description: "Cuts every price in this building by 4.7%",
  },
  rouletteWhirl: {
    label: "Roulette Whirl",
    color: COLOR.fullHouseCrimson,
    image: "crits/tableGamesAndCards/rouletteWhirl.webp",
    description:
      "Repeats the crit above and below, 80% chance to keep spreading",
  },
  showdown: {
    label: "Showdown",
    color: COLOR.dressCodeGreen,
    image: "crits/tableGamesAndCards/showdown.webp",
    description: "Hires 1 free worker on alternating floors",
  },
  highNoonHand: {
    label: "High Noon Hand",
    color: COLOR.autumnSaleAmber,
    image: "crits/tableGamesAndCards/highNoonHand.webp",
    description: "Thirty-six payouts here and on the highest floor",
  },
  sicBoShaker: {
    label: "Sic Bo Shaker",
    color: COLOR.doubleDownCrimson,
    image: "crits/tableGamesAndCards/sicBoShaker.webp",
    description: "Raises every floor below this one to its level",
  },
} as const satisfies Record<string, FeaturedCritData>;
