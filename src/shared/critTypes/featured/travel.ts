import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const TRAVEL_CRITS = {
  chooChoo: {
    label: "Choo Choo",
    color: COLOR.rainCheckBlue,
    image: "crits/travel/chooChoo.webp",
    description: "Adds 62.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chooChooShare),
  },
  clockTower: {
    label: "Clock Tower",
    color: COLOR.overflowBlue,
    image: "crits/travel/clockTower.webp",
    description: "Adds 62.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.clockTowerShare),
  },
  commuterLine: {
    label: "Commuter Line",
    color: COLOR.rainCheckBlue,
    image: "crits/travel/commuterLine.webp",
    description: "Adds 62.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.commuterLineShare),
  },
  mainStreet: {
    label: "Main Street",
    color: COLOR.sameBoatCoral,
    image: "crits/travel/mainStreet.webp",
    description: "Adds 63% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.mainStreetShare),
  },
  rooftopRainbow: {
    label: "Rooftop Rainbow",
    color: COLOR.fastForwardBlue,
    image: "crits/travel/rooftopRainbow.webp",
    description: "Adds 63.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.rooftopRainbowShare),
  },
  steamExpress: {
    label: "Steam Express",
    color: COLOR.overflowBlue,
    image: "crits/travel/steamExpress.webp",
    description: "Adds 63.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.steamExpressShare),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
