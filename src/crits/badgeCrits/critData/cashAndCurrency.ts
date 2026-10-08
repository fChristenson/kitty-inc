import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const CASH_AND_CURRENCY_CRITS = {
  bankroll: {
    label: "Bankroll",
    color: COLOR.paydayEmerald,
    image: "crits/cashAndCurrency/bankroll.webp",
    description: "Adds 6.4% of your total income",
  },
  billBlizzard: {
    label: "Bill Blizzard",
    color: COLOR.shareholdersGreen,
    image: "crits/cashAndCurrency/billBlizzard.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  cashCannon: {
    label: "Cash Cannon",
    color: COLOR.bonusRoundGold,
    image: "crits/cashAndCurrency/cashCannon.webp",
    description: "Adds 7s of your company's income",
  },
  fairExchange: {
    label: "Fair Exchange",
    color: COLOR.mergerGold,
    image: "crits/cashAndCurrency/fairExchange.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  liquidAssets: {
    label: "Liquid Assets",
    color: COLOR.goldenHandshakeGold,
    image: "crits/cashAndCurrency/liquidAssets.webp",
    description: "Adds 5% of your total income",
  },
  moneyPrinter: {
    label: "Money Printer",
    color: COLOR.bullMarketGreen,
    image: "crits/cashAndCurrency/moneyPrinter.webp",
    description: "Adds 12s of your company's income",
  },
  moneyTree: {
    label: "Money Tree",
    color: COLOR.moneyGreen,
    image: "crits/cashAndCurrency/moneyTree.webp",
    description: "Hires a free manager for this floor",
  },
  pennyJar: {
    label: "Penny Jar",
    color: COLOR.headhunterRust,
    image: "crits/cashAndCurrency/pennyJar.webp",
    description: "Cuts every price in this building by 1.3%",
  },
  vaultDoor: {
    label: "Vault Door",
    color: COLOR.unionBossSlate,
    image: "crits/cashAndCurrency/vaultDoor.webp",
    description: "Unlocks the next floor for free",
  },
  silverCoin: {
    label: "Silver Coin",
    color: COLOR.silverTicketGray,
    image: "crits/cashAndCurrency/silverCoin.webp",
    description: "Twenty-five payouts on alternating floors",
  },
  brassBanker: {
    label: "Brass Banker",
    color: COLOR.gold,
    image: "crits/cashAndCurrency/brassBanker.webp",
    description: "Unlocks the next floor for free",
  },
  citrusCoin: {
    label: "Citrus Coin",
    color: COLOR.sunshineGold,
    image: "crits/cashAndCurrency/citrusCoin.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  coinCascade: {
    label: "Coin Cascade",
    color: COLOR.gold,
    image: "crits/cashAndCurrency/coinCascade.webp",
    description:
      "Repeats the crit on the floor below, 53% chance to keep falling",
  },
  coinrootGrove: {
    label: "Coinroot Grove",
    color: COLOR.moneyGreen,
    image: "crits/cashAndCurrency/coinrootGrove.webp",
    description:
      "Repeats the crit on the floor below, 30% chance to keep falling",
  },
  allowance: {
    label: "Allowance",
    color: COLOR.moneyGreen,
    image: "crits/cashAndCurrency/allowance.webp",
    description: "Boosts every worker for 18s",
  },
  allowance2: {
    label: "Rainy Day Fund",
    color: COLOR.paydayEmerald,
    image: "crits/cashAndCurrency/allowance2.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  lootBags: {
    label: "Bagged and Tagged",
    color: COLOR.payoutOlive,
    image: "crits/cashAndCurrency/lootBags.webp",
    description: "Thirty-eight upgrades on the highest unlocked floor",
  },
  pocketMoney2: {
    label: "Petty Cash",
    color: COLOR.bullMarketGreen,
    image: "crits/cashAndCurrency/pocketMoney2.webp",
    description: "Thirty-seven instant payouts on every unlocked floor",
  },
  liquidAssets2: {
    label: "Fluid Capital",
    color: COLOR.espressoShotBrown,
    image: "crits/cashAndCurrency/liquidAssets2.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  pocketMoney: {
    label: "Pocket Money",
    color: COLOR.coinGold,
    image: "crits/cashAndCurrency/pocketMoney.webp",
    description: "One tier promotion and fifteen upgrades here",
  },
  capitalCarousel: {
    label: "Capital Carousel",
    color: COLOR.grandOpeningRose,
    image: "crits/cashAndCurrency/capitalCarousel.webp",
    description: "Forty-nine payouts on every unlocked floor",
  },
  fiscalFireworks: {
    label: "Fiscal Fireworks",
    color: COLOR.royalFlushPurple,
    image: "crits/cashAndCurrency/fiscalFireworks.webp",
    description: "Boosts every worker for 73s, counting as 2 extra workers",
  },
  payrollPagoda: {
    label: "Payroll Pagoda",
    color: COLOR.mysticTeal,
    image: "crits/cashAndCurrency/payrollPagoda.webp",
    description: "Fifty-two payouts on this floor and every floor below",
  },
  pensionPinata: {
    label: "Pension Pinata",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/cashAndCurrency/pensionPinata.webp",
    description: "Sixty-three payouts on the lowest-level floor",
  },
  receiptRocket: {
    label: "Receipt Rocket",
    color: COLOR.internSkyBlue,
    image: "crits/cashAndCurrency/receiptRocket.webp",
    description: "Unlocks the next 2 floors for free",
  },
  rubberBandReserve: {
    label: "Rubber Band Reserve",
    color: COLOR.goldenTicketYellow,
    image: "crits/cashAndCurrency/rubberBandReserve.webp",
    description: "Free office supplies for every unlocked floor",
  },
  looseChangeLauncher: {
    label: "Loose Change Launcher",
    color: COLOR.rainCheckBlue,
    image: "crits/cashAndCurrency/looseChangeLauncher.webp",
    description: "Unlocks the next 2 floors for free",
  },
} as const satisfies Record<string, FeaturedCritData>;
