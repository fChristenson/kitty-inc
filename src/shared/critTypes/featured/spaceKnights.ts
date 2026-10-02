import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const SPACE_KNIGHTS_CRITS = {
  blueBladeTabby: {
    label: "Blue Blade Tabby",
    color: COLOR.supplyRunTan,
    image: "crits/spaceKnights/blueBladeTabby.webp",
    description: "Grows this floor's level by 27.1% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.blueBladeTabbyGrowth),
  },
  brassBikini: {
    label: "Brass Bikini",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/spaceKnights/brassBikini.webp",
    description: "Grows this floor's level by 27.2% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.brassBikiniGrowth),
  },
  crimsonEyes: {
    label: "Crimson Eyes",
    color: COLOR.redActive,
    image: "crits/spaceKnights/crimsonEyes.webp",
    description: "Grows this floor's level by 27.3% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.crimsonEyesGrowth),
  },
  crimsonGauntlets: {
    label: "Crimson Gauntlets",
    color: COLOR.sameBoatCoral,
    image: "crits/spaceKnights/crimsonGauntlets.webp",
    description: "Grows this floor's level by 27.4% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.crimsonGauntletsGrowth),
  },
  goldenGaze: {
    label: "Golden Gaze",
    color: COLOR.red,
    image: "crits/spaceKnights/goldenGaze.webp",
    description: "Grows this floor's level by 27.5% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.goldenGazeGrowth),
  },
  hoodedMenace: {
    label: "Hooded Menace",
    color: COLOR.chairGiveawayBrown,
    image: "crits/spaceKnights/hoodedMenace.webp",
    description: "Adds 107s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.hoodedMenaceSeconds),
  },
  midnightCape: {
    label: "Midnight Cape",
    color: COLOR.nightShiftIndigo,
    image: "crits/spaceKnights/midnightCape.webp",
    description: "Grows this floor's level by 27.6% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.midnightCapeGrowth),
  },
  padawanPaws: {
    label: "Padawan Paws",
    color: COLOR.nightShiftIndigo,
    image: "crits/spaceKnights/padawanPaws.webp",
    description: "Adds 108s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.padawanPawsSeconds),
  },
  redSaberRaise: {
    label: "Red Saber Raise",
    color: COLOR.fullHouseCrimson,
    image: "crits/spaceKnights/redSaberRaise.webp",
    description: "Grows this floor's level by 27.7% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.redSaberRaiseGrowth),
  },
  sinisterSmirk: {
    label: "Sinister Smirk",
    color: COLOR.doubleDownCrimson,
    image: "crits/spaceKnights/sinisterSmirk.webp",
    description: "Adds 109s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.sinisterSmirkSeconds),
  },
  tentacleTresses: {
    label: "Tentacle Tresses",
    color: COLOR.rainCheckBlue,
    image: "crits/spaceKnights/tentacleTresses.webp",
    description: "Grows this floor's level by 27.8% in free upgrades",
    reward: (context, { actions, balance }) =>
      actions.growLevels([context.floor], balance.tentacleTressesGrowth),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
