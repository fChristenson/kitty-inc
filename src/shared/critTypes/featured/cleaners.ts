import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CLEANERS_CRITS = {
  bandanaSquad: {
    label: "Bandana Squad",
    color: COLOR.amberMuted,
    image: "crits/cleaners/bandanaSquad.webp",
    description: "Grows this floor's level by 26% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.bandanaSquadGrowth),
  },
  hiVisDuo: {
    label: "Hi Vis Duo",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/cleaners/hiVisDuo.webp",
    description: "Grows this floor's level by 26.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.hiVisDuoGrowth),
  },
  overallReady: {
    label: "Overall Ready",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cleaners/overallReady.webp",
    description: "Grows this floor's level by 26.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.overallReadyGrowth),
  },
  blueBobs: {
    label: "Blue Bobs",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/blueBobs.webp",
    description: "Adds 40.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.blueBobsShare),
  },
  featherDuster: {
    label: "Feather Duster",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/featherDuster.webp",
    description: "Adds 40.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.featherDusterShare),
  },
  maidCafe: {
    label: "Maid Cafe",
    color: COLOR.amberMuted,
    image: "crits/cleaners/maidCafe.webp",
    description: "Adds 40.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.maidCafeShare),
  },
  ravenTwins: {
    label: "Raven Twins",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/ravenTwins.webp",
    description: "Adds 40.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.ravenTwinsShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
