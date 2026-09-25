import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const BIG_PERSONALITIES_CRIT_INFO = {
  abraCashDabra: {
    label: "Abra-Cash-Dabra",
    color: COLOR.moneyGreen,
    icon: "abraCashDabra",
    description: "Twenty-five instant payouts on this floor",
  },
  captainOfIndustry: {
    label: "Captain of Industry",
    color: COLOR.fastForwardBlue,
    icon: "captainOfIndustry",
    description: "Twenty-one free upgrades on every unlocked floor",
  },
  clowningAround: {
    label: "Clowning Around",
    color: COLOR.summerSaleOrange,
    icon: "clowningAround",
    description: "Three upgrades and three payouts on every floor",
  },
  discoDividend: {
    label: "Disco Dividend",
    color: COLOR.silverTicketGray,
    icon: "discoDividend",
    description: "Eleven payouts on alternating floors, from the ground",
  },
  mimeYourBusiness: {
    label: "Mime Your Business",
    color: COLOR.winterSaleIceBlue,
    icon: "mimeYourBusiness",
    description: "Eight upgrades on this floor and every floor below",
  },
  redCarpetTreatment: {
    label: "Red Carpet Treatment",
    color: COLOR.fullHouseCrimson,
    icon: "redCarpetTreatment",
    description: "Twelve payouts from the highest-earning floor",
  },
  rockTheStock: {
    label: "Rock the Stock",
    color: COLOR.peppermintPink,
    icon: "rockTheStock",
    description: "Sixteen free upgrades on this floor",
  },
  strongReturn: {
    label: "Strong Return",
    color: COLOR.goldenHandshakeGold,
    icon: "strongReturn",
    description: "Twenty-six free upgrades on the highest floor",
  },
  theBigCheese: {
    label: "The Big Cheese",
    color: COLOR.sunshineGold,
    icon: "theBigCheese",
    description: "Two tier promotions and thirty upgrades here",
  },
  queenOfQueens: {
    label: "Queen of Queens",
    color: COLOR.royalFlushPurple,
    icon: "queenOfQueens",
    description: "Twenty-eight free upgrades on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
