import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CLEANERS_CRITS = {
  bandanaSquad: {
    label: "Bandana Squad",
    color: COLOR.amberMuted,
    image: "crits/cleaners/bandanaSquad.webp",
    description: "Grows this floor's level by 26% in free upgrades",
  },
  hiVisDuo: {
    label: "Hi Vis Duo",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/cleaners/hiVisDuo.webp",
    description: "Grows this floor's level by 26.1% in free upgrades",
  },
  overallReady: {
    label: "Overall Ready",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/cleaners/overallReady.webp",
    description: "Grows this floor's level by 26.2% in free upgrades",
  },
  blueBobs: {
    label: "Blue Bobs",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/blueBobs.webp",
    description: "Adds 40.2% of your total income",
  },
  featherDuster: {
    label: "Feather Duster",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/featherDuster.webp",
    description: "Adds 40.5% of your total income",
  },
  maidCafe: {
    label: "Maid Cafe",
    color: COLOR.amberMuted,
    image: "crits/cleaners/maidCafe.webp",
    description: "Adds 40.7% of your total income",
  },
  ravenTwins: {
    label: "Raven Twins",
    color: COLOR.sameBoatCoral,
    image: "crits/cleaners/ravenTwins.webp",
    description: "Adds 40.8% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
