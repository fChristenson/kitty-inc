import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const HEADPATS_CRITS = {
  ribbonRub: {
    label: "Ribbon Rub",
    color: COLOR.disabledGray,
    image: "crits/headpats/ribbonRub.webp",
    description: "Cuts every price in this building by 15.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.ribbonRubDiscount),
  },
  blushPat: {
    label: "Blush Pat",
    color: COLOR.secondWindSky,
    image: "crits/headpats/blushPat.webp",
    description: "Adds 12.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blushPatShare),
  },
  sleepyPat: {
    label: "Sleepy Pat",
    color: COLOR.unionBossSlate,
    image: "crits/headpats/sleepyPat.webp",
    description: "Boosts every worker for 78s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.sleepyPatBoostSeconds, balance.sleepyPatExtraWorkers),
  },
  gratefulPat: {
    label: "Grateful Pat",
    color: COLOR.easterSalePink,
    image: "crits/headpats/gratefulPat.webp",
    description: "Repeats the crit above and below, 87% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.gratefulPatContinueChance),
  },
  gigglePat: {
    label: "Giggle Pat",
    color: COLOR.unionBossSlate,
    image: "crits/headpats/gigglePat.webp",
    description: "Cuts every price in this building by 15.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.gigglePatDiscount),
  },
  beamingPat: {
    label: "Beaming Pat",
    color: COLOR.nightOwlIndigo,
    image: "crits/headpats/beamingPat.webp",
    description: "Adds 12.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.beamingPatShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
