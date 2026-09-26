import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const GAMES_OF_CHANCE_CRITS = {
  bullseye: {
    label: "Bullseye",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/bullseye.png",
    description: "Twenty-one free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.bullseyeUpgrades),
  },
  chainReaction: {
    label: "Chain Reaction",
    color: COLOR.blue,
    image: "crits/gamesOfChance/chainReaction.png",
    description: "Sixteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.chainReactionUpgrades,
      ),
  },
  doubleHelix: {
    label: "Double Helix",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/doubleHelix.png",
    description: "Fifteen upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.doubleHelixUpgrades),
  },
  eureka: {
    label: "Eureka",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/eureka.png",
    description: "One tier promotion and eighteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.eurekaTierSteps,
        balance.eurekaUpgrades,
      ),
  },
  goldMedal: {
    label: "Gold Medal",
    color: COLOR.goldenTicketYellow,
    image: "crits/gamesOfChance/goldMedal.png",
    description: "Thirty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.goldMedalPayouts),
  },
  halfLife: {
    label: "Half Life",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gamesOfChance/halfLife.png",
    description: "Twenty-eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.halfLifePayouts),
  },
  highRoller: {
    // kind kept as-is on purpose: badge counts persist per kind (see
    // critProcCounts), so renaming it would hand this crit's collection to the
    // dice-table cat below, which now carries the "High Roller" name instead
    label: "Stacked Chips",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/highRoller.png",
    description: "Twenty-eight payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.highRollerPayouts,
      ),
  },
  jackpot: {
    label: "Jackpot",
    color: COLOR.bonusRoundGold,
    image: "crits/gamesOfChance/jackpot.png",
    description: "Thirty-two free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.jackpotUpgrades),
  },
  knockout: {
    label: "Knockout",
    color: COLOR.red,
    image: "crits/gamesOfChance/knockout.png",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.knockoutUpgrades),
  },
  pearlDiver: {
    label: "Pearl Diver",
    color: COLOR.peppermintPink,
    image: "crits/gamesOfChance/pearlDiver.png",
    description: "Twenty-seven payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pearlDiverPayouts,
      ),
  },
  roundAndRound: {
    label: "Round and Round",
    color: COLOR.grandOpeningRose,
    image: "crits/gamesOfChance/roundAndRound.png",
    description: "Twenty-three payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.roundAndRoundPayouts),
  },
  scratchCard: {
    label: "Scratch Card",
    color: COLOR.internSkyBlue,
    image: "crits/gamesOfChance/scratchCard.png",
    description: "Thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.scratchCardPayouts),
  },
  silverware: {
    label: "Silverware",
    color: COLOR.silverTicketGray,
    image: "crits/gamesOfChance/silverware.png",
    description: "Twenty-nine upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.silverwareUpgrades),
  },
  snakeEyes: {
    label: "Snake Eyes",
    color: COLOR.white,
    image: "crits/gamesOfChance/snakeEyes.png",
    description: "Twenty payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.snakeEyesPayouts),
  },
  twentyOne: {
    label: "Twenty-One",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/twentyOne.png",
    description: "Seventeen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.twentyOneUpgrades,
      ),
  },
  wheelOfFortune: {
    label: "Wheel of Fortune",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/wheelOfFortune.png",
    description: "Two tier promotions and thirteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.wheelOfFortuneTierSteps,
        balance.wheelOfFortuneUpgrades,
      ),
  },
  highRoller3: {
    label: "Hot Dice",
    color: COLOR.red,
    image: "crits/gamesOfChance/highRoller3.png",
    description: "Thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.highRoller3Payouts),
  },
  splitThePot: {
    label: "High Roller",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/splitThePot.png",
    description: "Thirty-five upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      actions.upgrade([context.floor], balance.splitThePotUpgrades);
      actions.upgrade([highestFloor(context)], balance.splitThePotUpgrades);
    },
  },
  highRoller2: {
    label: "Chip Leader",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/highRoller2.png",
    description: "Thirty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.highRoller2Upgrades),
  },
  pokerNight: {
    label: "Poker Night",
    color: COLOR.mysticTeal,
    image: "crits/gamesOfChance/pokerNight.png",
    description: "Thirty-nine instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.pokerNightPayouts),
  },
  aceUpTheSleeve: {
    label: "Ace Up the Sleeve",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/aceUpTheSleeve.png",
    description: "One tier promotion and thirty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.aceUpTheSleeveTierSteps,
        balance.aceUpTheSleeveUpgrades,
      ),
  },
  baccaratBaron: {
    label: "Baccarat Baron",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/baccaratBaron.png",
    description: "Forty-nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.baccaratBaronPayouts,
      ),
  },
  betTheFarm: {
    label: "Bet the Farm",
    color: COLOR.fireDrillRed,
    image: "crits/gamesOfChance/betTheFarm.png",
    description: "Thirty-nine upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.betTheFarmUpgrades),
  },
  cardShark: {
    label: "Card Shark",
    color: COLOR.internSkyBlue,
    image: "crits/gamesOfChance/cardShark.png",
    description: "Twenty-four upgrades and twenty-six payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.cardSharkUpgrades,
        balance.cardSharkPayouts,
      ),
  },
  casinoWhale: {
    label: "Casino Whale",
    color: COLOR.fastForwardBlue,
    image: "crits/gamesOfChance/casinoWhale.png",
    description: "One tier promotion and thirty upgrades on the top earner",
    reward: (context, { balance, selectByRate, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.casinoWhaleTierSteps,
        balance.casinoWhaleUpgrades,
      ),
  },
  croupierSweep: {
    label: "Croupier Sweep",
    color: COLOR.chairGiveawayBrown,
    image: "crits/gamesOfChance/croupierSweep.png",
    description: "Forty-three upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.croupierSweepUpgrades),
  },
  dealersChoice: {
    label: "Dealer's Choice",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/dealersChoice.png",
    description: "Forty-five upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.dealersChoiceUpgrades),
  },
  feedTheKitty: {
    label: "Feed the Kitty",
    color: COLOR.autumnSaleAmber,
    image: "crits/gamesOfChance/feedTheKitty.png",
    description: "Forty-nine upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.feedTheKittyUpgrades),
  },
  bowlOfBets: {
    label: "Bowl of Bets",
    color: COLOR.blue,
    image: "crits/gamesOfChance/bowlOfBets.png",
    description: "Fifty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bowlOfBetsPayouts),
  },
  peekabooPot: {
    label: "Peekaboo Pot",
    color: COLOR.peppermintPink,
    image: "crits/gamesOfChance/peekabooPot.png",
    description: "Thirty-seven upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.peekabooPotUpgrades,
      ),
  },
  headsOrTails: {
    label: "Heads or Tails",
    color: COLOR.goldenTicketYellow,
    image: "crits/gamesOfChance/headsOrTails.png",
    description: "Forty-seven payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.headsOrTailsPayouts),
  },
  highSteaks: {
    label: "High Steaks",
    color: COLOR.espressoShotBrown,
    image: "crits/gamesOfChance/highSteaks.png",
    description: "Fifty-one upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.highSteaksUpgrades),
  },
  lottoLlama: {
    label: "Lotto Llama",
    color: COLOR.grandOpeningRose,
    image: "crits/gamesOfChance/lottoLlama.png",
    description: "Fifty-three payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.lottoLlamaPayouts),
  },
  mahjongMaestro: {
    label: "Mahjong Maestro",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/mahjongMaestro.png",
    description: "Two tier promotions and twenty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.mahjongMaestroTierSteps,
        balance.mahjongMaestroUpgrades,
      ),
  },
  neonStrip: {
    label: "Neon Strip",
    color: COLOR.royalFlushPurple,
    image: "crits/gamesOfChance/neonStrip.png",
    description: "Forty-eight upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.neonStripUpgrades),
  },
  oneArmedBandit: {
    label: "One-Armed Bandit",
    color: COLOR.red,
    image: "crits/gamesOfChance/oneArmedBandit.png",
    description: "Twenty-nine upgrades and thirty-one payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.oneArmedBanditUpgrades,
        balance.oneArmedBanditPayouts,
      ),
  },
  slotStickup: {
    label: "Slot Stickup",
    color: COLOR.nightShiftIndigo,
    image: "crits/gamesOfChance/slotStickup.png",
    description: "Fifty-five payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.slotStickupPayouts,
      ),
  },
  pachinkoPlunge: {
    label: "Pachinko Plunge",
    color: COLOR.mysticTeal,
    image: "crits/gamesOfChance/pachinkoPlunge.png",
    description: "Forty-four payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.pachinkoPlungePayouts),
  },
  photoFinish: {
    label: "Photo Finish",
    color: COLOR.luckyCloverGreen,
    image: "crits/gamesOfChance/photoFinish.png",
    description: "Thirty-nine upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.photoFinishUpgrades,
      ),
  },
  pitBoss: {
    label: "Pit Boss",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/gamesOfChance/pitBoss.png",
    description: "Fifty-three upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.pitBossUpgrades),
  },
  casinoBouncer: {
    label: "Casino Bouncer",
    color: COLOR.silverTicketGray,
    image: "crits/gamesOfChance/casinoBouncer.png",
    description: "Fifty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.casinoBouncerUpgrades),
  },
  clipboardKingpin: {
    label: "Clipboard Kingpin",
    color: COLOR.goldStandardAmber,
    image: "crits/gamesOfChance/clipboardKingpin.png",
    description:
      "Eighteen upgrades and sixteen payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.clipboardKingpinUpgrades,
        balance.clipboardKingpinPayouts,
      ),
  },
  earpieceEnforcer: {
    label: "Earpiece Enforcer",
    color: COLOR.amberMuted,
    image: "crits/gamesOfChance/earpieceEnforcer.png",
    description:
      "Twenty-six upgrades and thirty payouts on the highest unlocked floor",
    reward: (context, { balance, highestFloor, upgradeAndPay }) =>
      upgradeAndPay(
        [highestFloor(context)],
        balance.earpieceEnforcerUpgrades,
        balance.earpieceEnforcerPayouts,
      ),
  },
  pokerChipmunk: {
    label: "Poker Chipmunk",
    color: COLOR.bonusRoundGold,
    image: "crits/gamesOfChance/pokerChipmunk.png",
    description: "Fifty-seven payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.pokerChipmunkPayouts),
  },
  pokerFace: {
    label: "Poker Face",
    color: COLOR.goldenHandshakeGold,
    image: "crits/gamesOfChance/pokerFace.png",
    description: "Fifty-six upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade([selectByRate(context, true)], balance.pokerFaceUpgrades),
  },
  stoneColdBluff: {
    label: "Stone-Cold Bluff",
    color: COLOR.white,
    image: "crits/gamesOfChance/stoneColdBluff.png",
    description:
      "Twenty-five upgrades and twenty-seven payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.stoneColdBluffUpgrades,
        balance.stoneColdBluffPayouts,
      ),
  },
  deadpanDeal: {
    label: "Deadpan Deal",
    color: COLOR.pairBlue,
    image: "crits/gamesOfChance/deadpanDeal.png",
    description: "Fifty-eight payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.deadpanDealPayouts),
  },
  rouletteWhirl: {
    label: "Roulette Whirl",
    color: COLOR.fullHouseCrimson,
    image: "crits/gamesOfChance/rouletteWhirl.png",
    description: "Forty-three payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.rouletteWhirlPayouts),
  },
  showdown: {
    label: "Showdown",
    color: COLOR.dressCodeGreen,
    image: "crits/gamesOfChance/showdown.png",
    description: "Thirty-two upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate, hereAnd }) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.showdownUpgrades,
      ),
  },
  highNoonHand: {
    label: "High Noon Hand",
    color: COLOR.autumnSaleAmber,
    image: "crits/gamesOfChance/highNoonHand.png",
    description: "Thirty-six payouts here and on the highest floor",
    reward: (context, { actions, balance, highestFloor, hereAnd }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.highNoonHandPayouts,
      ),
  },
  sicBoShaker: {
    label: "Sic Bo Shaker",
    color: COLOR.doubleDownCrimson,
    image: "crits/gamesOfChance/sicBoShaker.png",
    description:
      "Twenty-three upgrades and twenty-eight payouts on alternating floors",
    reward: (context, { balance, alternating, upgradeAndPay }) =>
      upgradeAndPay(
        alternating(context),
        balance.sicBoShakerUpgrades,
        balance.sicBoShakerPayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
