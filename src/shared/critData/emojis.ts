import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const EMOJIS_CRITS = {
  fedoraFrown: {
    label: "Fedora Frown",
    color: COLOR.starYellow,
    image: "crits/emojis/fedoraFrown.webp",
    description: "Boosts every worker for 85s, counting as 2 extra workers",
  },
  midnightMobster: {
    label: "Midnight Mobster",
    color: COLOR.doubleDownCrimson,
    image: "crits/emojis/midnightMobster.webp",
    description: "Repeats the crit above and below, 96% chance to keep spreading",
  },
  trenchCoatSquint: {
    label: "Trench Coat Squint",
    color: COLOR.sunshineGold,
    image: "crits/emojis/trenchCoatSquint.webp",
    description: "Cuts every price in this building by 16.4%",
  },
  crimsonFedora: {
    label: "Crimson Fedora",
    color: COLOR.starYellow,
    image: "crits/emojis/crimsonFedora.webp",
    description: "Adds 13.3% of your total income",
  },
  winkAndBlush: {
    label: "Wink And Blush",
    color: COLOR.fullHouseCrimson,
    image: "crits/emojis/winkAndBlush.webp",
    description: "Boosts every worker for 86s, counting as 2 extra workers",
  },
} as const satisfies Record<string, FeaturedCritData>;
