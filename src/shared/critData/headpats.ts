import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const HEADPATS_CRITS = {
  ribbonRub: {
    label: "Ribbon Rub",
    color: COLOR.disabledGray,
    image: "crits/headpats/ribbonRub.webp",
    description: "Cuts every price in this building by 15.5%",
  },
  blushPat: {
    label: "Blush Pat",
    color: COLOR.secondWindSky,
    image: "crits/headpats/blushPat.webp",
    description: "Adds 12.3% of your total income",
  },
  sleepyPat: {
    label: "Sleepy Pat",
    color: COLOR.unionBossSlate,
    image: "crits/headpats/sleepyPat.webp",
    description: "Boosts every worker for 78s, counting as 2 extra workers",
  },
  gratefulPat: {
    label: "Grateful Pat",
    color: COLOR.easterSalePink,
    image: "crits/headpats/gratefulPat.webp",
    description: "Repeats the crit above and below, 87% chance to keep spreading",
  },
  gigglePat: {
    label: "Giggle Pat",
    color: COLOR.unionBossSlate,
    image: "crits/headpats/gigglePat.webp",
    description: "Cuts every price in this building by 15.6%",
  },
  beamingPat: {
    label: "Beaming Pat",
    color: COLOR.nightOwlIndigo,
    image: "crits/headpats/beamingPat.webp",
    description: "Adds 12.4% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
