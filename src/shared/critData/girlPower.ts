import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GIRL_POWER_CRITS = {
  streetSquad: {
    label: "Street Squad",
    color: COLOR.teal,
    image: "crits/girlPower/streetSquad.webp",
    description: "Repeats the crit on the floor below, 65% chance to keep falling",
  },
  divaTrio: {
    label: "Diva Trio",
    color: COLOR.gold,
    image: "crits/girlPower/divaTrio.webp",
    description: "Two tier promotions and forty upgrades here",
  },
  squadGoals: {
    label: "Squad Goals",
    color: COLOR.fastForwardBlue,
    image: "crits/girlPower/squadGoals.webp",
    description: "Cuts every price in this building by 11.2%",
  },
  hypeCrew: {
    label: "Hype Crew",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/girlPower/hypeCrew.webp",
    description: "Adds 10.7% of your total income",
  },
  girlGangBadge: {
    label: "Girl Gang Badge",
    color: COLOR.overflowBlue,
    image: "crits/girlPower/girlGangBadge.webp",
    description: "Boosts every worker for 63s, counting as 1 extra worker",
  },
  leopardLineup: {
    label: "Leopard Lineup",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/girlPower/leopardLineup.webp",
    description: "Repeats the crit on the floor above, 66% chance to keep climbing",
  },
  bleacherCheer: {
    label: "Bleacher Cheer",
    color: COLOR.amberMuted,
    image: "crits/girlPower/bleacherCheer.webp",
    description: "Adds 41.8% of your total income",
  },
  carpoolCool: {
    label: "Carpool Cool",
    color: COLOR.coffeeRunTeal,
    image: "crits/girlPower/carpoolCool.webp",
    description: "Adds 41.9% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
