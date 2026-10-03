import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const FIREFIGHTERS_CRITS = {
  blazeBusters: {
    label: "Blaze Busters",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/firefighters/blazeBusters.webp",
    description: "Adds 41.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blazeBustersShare),
  },
  fireBrigade: {
    label: "Fire Brigade",
    color: COLOR.headhunterRust,
    image: "crits/firefighters/fireBrigade.webp",
    description: "Adds 41.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.fireBrigadeShare),
  },
  helmetHeroes: {
    label: "Helmet Heroes",
    color: COLOR.gold,
    image: "crits/firefighters/helmetHeroes.webp",
    description: "Adds 41.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.helmetHeroesShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
