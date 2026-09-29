import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const EMOJIS_CRITS = {
  fedoraFrown: {
    label: "Fedora Frown",
    color: COLOR.starYellow,
    image: "crits/emojis/fedoraFrown.webp",
    description: "Boosts every worker for 85s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.fedoraFrownBoostSeconds, balance.fedoraFrownExtraWorkers),
  },
  midnightMobster: {
    label: "Midnight Mobster",
    color: COLOR.doubleDownCrimson,
    image: "crits/emojis/midnightMobster.webp",
    description: "Repeats the crit above and below, 96% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.midnightMobsterContinueChance),
  },
  trenchCoatSquint: {
    label: "Trench Coat Squint",
    color: COLOR.sunshineGold,
    image: "crits/emojis/trenchCoatSquint.webp",
    description: "Cuts every price in this building by 16.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.trenchCoatSquintDiscount),
  },
  crimsonFedora: {
    label: "Crimson Fedora",
    color: COLOR.starYellow,
    image: "crits/emojis/crimsonFedora.webp",
    description: "Adds 13.3% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.crimsonFedoraShare),
  },
  winkAndBlush: {
    label: "Wink And Blush",
    color: COLOR.fullHouseCrimson,
    image: "crits/emojis/winkAndBlush.webp",
    description: "Boosts every worker for 86s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.winkAndBlushBoostSeconds, balance.winkAndBlushExtraWorkers),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
