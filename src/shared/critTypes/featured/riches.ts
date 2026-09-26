import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const RICHES_CRITS = {
  adamWhiskersen: {
    label: "Adam Whiskersen",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/adamWhiskersen.png",
    description: "Two tier promotions and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.adamWhiskersenTierSteps,
        balance.adamWhiskersenUpgrades,
      ),
  },
  bankroll: {
    label: "Bankroll",
    color: COLOR.paydayEmerald,
    image: "crits/riches/bankroll.png",
    description: "Twenty-five free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bankrollUpgrades),
  },
  billBlizzard: {
    label: "Bill Blizzard",
    color: COLOR.shareholdersGreen,
    image: "crits/riches/billBlizzard.png",
    description: "Twenty-three payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.billBlizzardPayouts),
  },
  bobPawge: {
    label: "Bob Pawge",
    color: COLOR.nightShiftIndigo,
    image: "crits/riches/bobPawge.png",
    description: "Twenty-four free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.bobPawgeUpgrades),
  },
  bullionStack: {
    label: "Bullion Brigade",
    color: COLOR.gold,
    image: "crits/riches/bullionStack.png",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bullionStackUpgrades),
  },
  cashCannon: {
    label: "Cash Cannon",
    color: COLOR.bonusRoundGold,
    image: "crits/riches/cashCannon.png",
    description: "Ten upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.cashCannonUpgrades),
  },
  fairExchange: {
    label: "Fair Exchange",
    color: COLOR.mergerGold,
    image: "crits/riches/fairExchange.png",
    description: "Eighteen payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.fairExchangePayouts),
  },
  gemMine: {
    label: "Gem Mine",
    color: COLOR.pairBlue,
    image: "crits/riches/gemMine.png",
    description: "Ten upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.gemMineUpgrades,
      ),
  },
  goldMine: {
    label: "Gold Mine",
    color: COLOR.supplyRunTan,
    image: "crits/riches/goldMine.png",
    description: "Fifteen payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.goldMinePayouts),
  },
  goldenChalice: {
    label: "Golden Chalice",
    color: COLOR.sunshineGold,
    image: "crits/riches/goldenChalice.png",
    description: "Two tier promotions and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.goldenChaliceTierSteps,
        balance.goldenChaliceUpgrades,
      ),
  },
  goldenGoose: {
    label: "Golden Goose",
    color: COLOR.goldenTicketYellow,
    image: "crits/riches/goldenGoose.png",
    description: "Twenty-one payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldenGoosePayouts),
  },
  goldenStag: {
    label: "Golden Stag",
    color: COLOR.heavenlyGold,
    image: "crits/riches/goldenStag.png",
    description: "Twenty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.goldenStagPayouts,
      ),
  },
  handsomeJake: {
    label: "Handsome Jake",
    color: COLOR.orange,
    image: "crits/riches/handsomeJake.png",
    description: "Eighteen upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.handsomeJakeUpgrades),
  },
  jcDentclaw: {
    label: "JC Dentclaw",
    color: COLOR.nightOwlIndigo,
    image: "crits/riches/jcDentclaw.png",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.jcDentclawUpgrades),
  },
  liquidAssets: {
    label: "Liquid Assets",
    color: COLOR.goldenHandshakeGold,
    image: "crits/riches/liquidAssets.png",
    description: "Twenty-one payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.liquidAssetsPayouts,
      ),
  },
  midasTouch: {
    label: "Midas Touch",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/midasTouch.png",
    description: "One tier promotion and thirteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.midasTouchTierSteps,
        balance.midasTouchUpgrades,
      ),
  },
  moneyPrinter: {
    label: "Money Printer",
    color: COLOR.bullMarketGreen,
    image: "crits/riches/moneyPrinter.png",
    description: "Twenty-three free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.moneyPrinterUpgrades),
  },
  moneyTree: {
    label: "Money Tree",
    color: COLOR.moneyGreen,
    image: "crits/riches/moneyTree.png",
    description: "Twenty-two payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.moneyTreePayouts),
  },
  nuggetAvalanche: {
    label: "Nugget Avalanche",
    color: COLOR.amber,
    image: "crits/riches/nuggetAvalanche.png",
    description: "Seventeen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.nuggetAvalanchePayouts),
  },
  pennyJar: {
    label: "Penny Jar",
    color: COLOR.headhunterRust,
    image: "crits/riches/pennyJar.png",
    description: "Fifteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.pennyJarUpgrades),
  },
  purrDenton: {
    label: "Purr Denton",
    color: COLOR.fastForwardBlue,
    image: "crits/riches/purrDenton.png",
    description: "Seventeen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.purrDentonUpgrades),
  },
  strikeItRich: {
    label: "Strike It Rich",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/riches/strikeItRich.png",
    description: "Sixteen upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.strikeItRichUpgrades),
  },
  vaultDoor: {
    label: "Vault Door",
    color: COLOR.unionBossSlate,
    image: "crits/riches/vaultDoor.png",
    description: "Twenty-two free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.vaultDoorUpgrades),
  },
  wishingWell: {
    label: "Wishing Well",
    color: COLOR.rainCheckBlue,
    image: "crits/riches/wishingWell.png",
    description: "Twenty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.wishingWellPayouts),
  },
  youKnowWhatStallion: {
    label: "You Know What, Stallion",
    color: COLOR.royalFlushPurple,
    image: "crits/riches/youKnowWhatStallion.png",
    description: "Eleven upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(
        alternating(context),
        balance.youKnowWhatStallionUpgrades,
      ),
  },
  goldBar: {
    label: "Gold Bar",
    color: COLOR.gold,
    image: "crits/riches/goldBar.png",
    description: "Thirty-one payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldBarPayouts),
  },
  silverCoin: {
    label: "Silver Coin",
    color: COLOR.silverTicketGray,
    image: "crits/riches/silverCoin.png",
    description: "Twenty-five payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.silverCoinPayouts),
  },
  gildedCache: {
    label: "Gilded Cache",
    color: COLOR.gold,
    image: "crits/riches/gildedCache.png",
    description: "Thirty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.gildedCacheUpgrades),
  },
  brassBanker: {
    label: "Brass Banker",
    color: COLOR.gold,
    image: "crits/riches/brassBanker.png",
    description: "Thirty-four free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.brassBankerUpgrades),
  },
  citrusCoin: {
    label: "Citrus Coin",
    color: COLOR.sunshineGold,
    image: "crits/riches/citrusCoin.png",
    description: "Thirty-three payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.citrusCoinPayouts),
  },
  coinCascade: {
    label: "Coin Cascade",
    color: COLOR.gold,
    image: "crits/riches/coinCascade.png",
    description: "Thirty-eight payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.coinCascadePayouts),
  },
  coinrootGrove: {
    label: "Coinroot Grove",
    color: COLOR.moneyGreen,
    image: "crits/riches/coinrootGrove.png",
    description: "Twenty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.coinrootGroveUpgrades),
  },
  allowance: {
    label: "Allowance",
    color: COLOR.moneyGreen,
    image: "crits/riches/allowance.png",
    description: "Thirty payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.allowancePayouts),
  },
  allowance2: {
    label: "Rainy Day Fund",
    color: COLOR.paydayEmerald,
    image: "crits/riches/allowance2.png",
    description: "Thirty-two free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.allowance2Upgrades),
  },
  lootBags: {
    label: "Bagged and Tagged",
    color: COLOR.payoutOlive,
    image: "crits/riches/lootBags.png",
    description: "Thirty-eight upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.lootBagsUpgrades),
  },
  pocketMoney2: {
    label: "Petty Cash",
    color: COLOR.bullMarketGreen,
    image: "crits/riches/pocketMoney2.png",
    description: "Thirty-seven instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.pocketMoney2Payouts),
  },
  liquidAssets2: {
    label: "Fluid Capital",
    color: COLOR.espressoShotBrown,
    image: "crits/riches/liquidAssets2.png",
    description: "Forty-four payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.liquidAssets2Payouts,
      ),
  },
  pocketMoney: {
    label: "Pocket Money",
    color: COLOR.coinGold,
    image: "crits/riches/pocketMoney.png",
    description: "One tier promotion and fifteen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.pocketMoneyTierSteps,
        balance.pocketMoneyUpgrades,
      ),
  },
  capitalCarousel: {
    label: "Capital Carousel",
    color: COLOR.grandOpeningRose,
    image: "crits/riches/capitalCarousel.png",
    description: "Forty-nine payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.capitalCarouselPayouts),
  },
  executiveEscalator: {
    label: "Executive Escalator",
    color: COLOR.fastForwardBlue,
    image: "crits/riches/executiveEscalator.png",
    description: "Fifty-two upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(
        belowAndHere(context),
        balance.executiveEscalatorUpgrades,
      ),
  },
  fiscalFireworks: {
    label: "Fiscal Fireworks",
    color: COLOR.royalFlushPurple,
    image: "crits/riches/fiscalFireworks.png",
    description: "Forty-five upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.fiscalFireworksUpgrades),
  },
  gildedGong: {
    label: "Gilded Gong",
    color: COLOR.bonusRoundGold,
    image: "crits/riches/gildedGong.png",
    description: "Fifty-seven payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.gildedGongPayouts),
  },
  overtimeOracle: {
    label: "Overtime Oracle",
    color: COLOR.dressCodeGreen,
    image: "crits/riches/overtimeOracle.png",
    description: "Sixty-seven payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.overtimeOraclePayouts,
      ),
  },
  paperworkPaladin: {
    label: "Paperwork Paladin",
    color: COLOR.red,
    image: "crits/riches/paperworkPaladin.png",
    description: "Sixty upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.paperworkPaladinUpgrades),
  },
  payrollPagoda: {
    label: "Payroll Pagoda",
    color: COLOR.mysticTeal,
    image: "crits/riches/payrollPagoda.png",
    description: "Fifty-two payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.payrollPagodaPayouts),
  },
  pensionPinata: {
    label: "Pension Pinata",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/riches/pensionPinata.png",
    description: "Sixty-three payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.pensionPinataPayouts),
  },
  profitPretzel: {
    label: "Profit Pretzel",
    color: COLOR.goldStandardAmber,
    image: "crits/riches/profitPretzel.png",
    description: "Forty-four upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.profitPretzelUpgrades,
      ),
  },
  receiptRocket: {
    label: "Receipt Rocket",
    color: COLOR.internSkyBlue,
    image: "crits/riches/receiptRocket.png",
    description: "Sixty-two payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.receiptRocketPayouts),
  },
  rubberBandReserve: {
    label: "Rubber Band Reserve",
    color: COLOR.goldenTicketYellow,
    image: "crits/riches/rubberBandReserve.png",
    description: "Sixty-six payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.rubberBandReservePayouts),
  },
  sovereignSnowglobe: {
    label: "Sovereign Snowglobe",
    color: COLOR.goldenHandshakeGold,
    image: "crits/riches/sovereignSnowglobe.png",
    description:
      "One tier promotion and thirty-nine upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.sovereignSnowglobeTierSteps,
        balance.sovereignSnowglobeUpgrades,
      ),
  },
  velvetLockbox: {
    label: "Velvet Lockbox",
    color: COLOR.doubleDownCrimson,
    image: "crits/riches/velvetLockbox.png",
    description: "Fifty-eight upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.velvetLockboxUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
