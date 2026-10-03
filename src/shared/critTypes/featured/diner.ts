import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DINER_CRITS = {
  orderUp: {
    label: "Order Up",
    color: COLOR.sameBoatCoral,
    image: "crits/diner/orderUp.webp",
    description: "Adds 41.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.orderUpShare),
  },
  sodaFountain: {
    label: "Soda Fountain",
    color: COLOR.coinGold,
    image: "crits/diner/sodaFountain.webp",
    description: "Adds 41.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.sodaFountainShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
