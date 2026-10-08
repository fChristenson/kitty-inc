import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const CAKES_CRITS = {
  blackForestFortune: {
    label: "Black Forest Fortune",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/blackForestFortune.webp",
    description: "Adds 14.4% of your total income",
  },
  redVelvetRope: {
    label: "Red Velvet Rope",
    color: COLOR.red,
    image: "crits/cakes/redVelvetRope.webp",
    description: "One tier promotion and twenty-nine upgrades here",
  },
  tiramisuTycoon: {
    label: "Tiramisu Tycoon",
    color: COLOR.espressoShotBrown,
    image: "crits/cakes/tiramisuTycoon.webp",
    description: "Adds 83s of your company's income",
  },
  cheesecakeChairman: {
    label: "Cheesecake Chairman",
    color: COLOR.springSalePink,
    image: "crits/cakes/cheesecakeChairman.webp",
    description: "Fifty free upgrades on this floor",
  },
  carrotCakeCapital: {
    label: "Carrot Cake Capital",
    color: COLOR.summerSaleOrange,
    image: "crits/cakes/carrotCakeCapital.webp",
    description: "Adds 20% of your total income",
  },
  angelFoodAscension: {
    label: "Angel Food Ascension",
    color: COLOR.heavenlyGold,
    image: "crits/cakes/angelFoodAscension.webp",
    description: "Two tier promotions and twenty-four upgrades here",
  },
  poundCakeProfits: {
    label: "Pound Cake Profits",
    color: COLOR.gold,
    image: "crits/cakes/poundCakeProfits.webp",
    description: "Adds 24s of your company's income",
  },
  bundtFund: {
    label: "Bundt Fund",
    color: COLOR.sunshineGold,
    image: "crits/cakes/bundtFund.webp",
    description: "Cuts every price in this building by 4.3%",
  },
  lavaCakeLiquidity: {
    label: "Lava Cake Liquidity",
    color: COLOR.orange,
    image: "crits/cakes/lavaCakeLiquidity.webp",
    description: "Forty-four payouts on the highest unlocked floor",
  },
  upsideDownUpswing: {
    label: "Upside-Down Upswing",
    color: COLOR.goldenTicketYellow,
    image: "crits/cakes/upsideDownUpswing.webp",
    description: "Forty-three upgrades tumbling down the floors below",
  },
  browniePoints: {
    label: "Brownie Points",
    color: COLOR.chairGiveawayBrown,
    image: "crits/cakes/browniePoints.webp",
    description: "Twenty-five upgrades and fifteen payouts on the lowest floor",
  },
  torteReform: {
    label: "Torte Reform",
    color: COLOR.unionBossSlate,
    image: "crits/cakes/torteReform.webp",
    description: "Forty-three upgrades on the highest unlocked floor",
  },
  justDesserts: {
    label: "Just Desserts",
    color: COLOR.fullHouseCrimson,
    image: "crits/cakes/justDesserts.webp",
    description: "Hires 2 free workers on every unlocked floor",
  },
  sweetVerdict: {
    label: "Sweet Verdict",
    color: COLOR.executiveOrderTeal,
    image: "crits/cakes/sweetVerdict.webp",
    description: "Caps every floor's income timer at 0.5s for 15s",
  },
  operaCakeOverture: {
    label: "Opera Cake Overture",
    color: COLOR.royalFlushPurple,
    image: "crits/cakes/operaCakeOverture.webp",
    description: "Two tier promotions and twenty-six upgrades here",
  },
  sacherStockpile: {
    label: "Sacher Stockpile",
    color: COLOR.goldenHandshakeGold,
    image: "crits/cakes/sacherStockpile.webp",
    description: "Adds 41.2% of your total income",
  },
  tripleLayerTreasury: {
    label: "Triple Layer Treasury",
    color: COLOR.goldStandardAmber,
    image: "crits/cakes/tripleLayerTreasury.webp",
    description: "Thirty-eight upgrades on every unlocked floor",
  },
  layeredSecurity: {
    label: "Layered Security",
    color: COLOR.silverTicketGray,
    image: "crits/cakes/layeredSecurity.webp",
    description:
      "Repeats the crit above and below, 42% chance to keep spreading",
  },
  mississippiMudMillionaire: {
    label: "Mississippi Mud Millionaire",
    color: COLOR.bonusRoundGold,
    image: "crits/cakes/mississippiMudMillionaire.webp",
    description: "Adds 90s of your company's income",
  },
  swissRollRollover: {
    label: "Swiss Roll Rollover",
    color: COLOR.mergerGold,
    image: "crits/cakes/swissRollRollover.webp",
    description:
      "Repeats the crit on the floor above, 56% chance to keep climbing",
  },
  chocolateDripDynamo: {
    label: "Chocolate Drip Dynamo",
    color: COLOR.espressoShotBrown,
    image: "crits/cakes/chocolateDripDynamo.webp",
    description: "Forty-five payouts on the lowest-level floor",
  },
  marbleCakeMargin: {
    label: "Marble Cake Margin",
    color: COLOR.winterSaleIceBlue,
    image: "crits/cakes/marbleCakeMargin.webp",
    description:
      "Repeats the crit on the floor below, 60% chance to keep falling",
  },
  souffleSurplus: {
    label: "Soufflé Surplus",
    color: COLOR.sunshineGold,
    image: "crits/cakes/souffleSurplus.webp",
    description: "Forty-one upgrades on this floor and every floor below",
  },
  onTheRise: {
    label: "On the Rise",
    color: COLOR.grandOpeningRose,
    image: "crits/cakes/onTheRise.webp",
    description: "Unlocks the next 3 floors for free",
  },
} as const satisfies Record<string, FeaturedCritData>;
