import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const CAKES_CRIT_INFO = {
  blackForestFortune: {
    label: "Black Forest Fortune",
    color: COLOR.chairGiveawayBrown,
    icon: "blackForestFortune",
    description: "Eighteen upgrades and twenty-four payouts on this floor",
  },
  redVelvetRope: {
    label: "Red Velvet Rope",
    color: COLOR.red,
    icon: "redVelvetRope",
    description: "One tier promotion and twenty-nine upgrades here",
  },
  tiramisuTycoon: {
    label: "Tiramisu Tycoon",
    color: COLOR.espressoShotBrown,
    icon: "tiramisuTycoon",
    description: "Twenty-four upgrades and twenty-one payouts on the top earner",
  },
  cheesecakeChairman: {
    label: "Cheesecake Chairman",
    color: COLOR.springSalePink,
    icon: "cheesecakeChairman",
    description: "Fifty free upgrades on this floor",
  },
  carrotCakeCapital: {
    label: "Carrot Cake Capital",
    color: COLOR.summerSaleOrange,
    icon: "carrotCakeCapital",
    description: "Twenty-three upgrades and seventeen payouts on the lowest floor",
  },
  angelFoodAscension: {
    label: "Angel Food Ascension",
    color: COLOR.heavenlyGold,
    icon: "angelFoodAscension",
    description: "Two tier promotions and twenty-four upgrades here",
  },
  poundCakeProfits: {
    label: "Pound Cake Profits",
    color: COLOR.gold,
    icon: "poundCakeProfits",
    description: "Forty-one instant payouts on this floor",
  },
  bundtFund: {
    label: "Bundt Fund",
    color: COLOR.sunshineGold,
    icon: "bundtFund",
    description: "Thirty-nine payouts on alternating floors",
  },
  lavaCakeLiquidity: {
    label: "Lava Cake Liquidity",
    color: COLOR.orange,
    icon: "lavaCakeLiquidity",
    description: "Forty-four payouts on the highest unlocked floor",
  },
  upsideDownUpswing: {
    label: "Upside-Down Upswing",
    color: COLOR.goldenTicketYellow,
    icon: "upsideDownUpswing",
    description: "Forty-three upgrades tumbling down the floors below",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
