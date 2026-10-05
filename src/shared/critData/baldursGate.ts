import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const BALDURS_GATE_CRITS = {
  astapurrion: {
    label: "Astapurrion",
    color: COLOR.fullHouseCrimson,
    image: "crits/baldursGate/astapurrion.webp",
    description: "Nineteen instant payouts on this floor",
  },
  astralclawSkyblade: {
    label: "Astralclaw Skyblade",
    color: COLOR.red,
    image: "crits/baldursGate/astralclawSkyblade.webp",
    description: "Hires a free manager for this floor",
  },
  drizztDoPurrden: {
    label: "Drizzt Do'Purrden",
    color: COLOR.cyan,
    image: "crits/baldursGate/drizztDoPurrden.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  elmiaowster: {
    label: "Elmiaowster",
    color: COLOR.royalFlushPurple,
    image: "crits/baldursGate/elmiaowster.webp",
    description: "Two tier promotions and six upgrades here",
  },
  elvenSongblade: {
    label: "Elven Songblade",
    color: COLOR.pairBlue,
    image: "crits/baldursGate/elvenSongblade.webp",
    description: "Cuts every price in this building by 2.2%",
  },
  galepaw: {
    label: "Galepaw",
    color: COLOR.purple,
    image: "crits/baldursGate/galepaw.webp",
    description: "Eleven payouts on every unlocked floor",
  },
  halsinpaw: {
    label: "Halsinpaw",
    color: COLOR.dressCodeGreen,
    image: "crits/baldursGate/halsinpaw.webp",
    description: "Sixteen free upgrades on every unlocked floor",
  },
  hearthpawShadowagent: {
    label: "Hearthpaw Shadowagent",
    color: COLOR.nightShiftIndigo,
    image: "crits/baldursGate/hearthpawShadowagent.webp",
    description: "Twenty payouts from the highest-earning floor",
  },
  imeown: {
    label: "Imeown",
    color: COLOR.peppermintPink,
    image: "crits/baldursGate/imeown.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  jaheirball: {
    label: "Jaheirball",
    color: COLOR.moneyGreen,
    image: "crits/baldursGate/jaheirball.webp",
    description: "Fourteen payouts on alternating floors",
  },
  karlachonk: {
    label: "Karlachonk",
    color: COLOR.orange,
    image: "crits/baldursGate/karlachonk.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  laezclaw: {
    label: "Lae'zclaw",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/baldursGate/laezclaw.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  minscAndMeow: {
    label: "Minsc and Meow",
    color: COLOR.supplyRunTan,
    image: "crits/baldursGate/minscAndMeow.webp",
    description:
      "Repeats the crit on the floor above, 27% chance to keep climbing",
  },
  sarevmeowk: {
    label: "Sarevmeowk",
    color: COLOR.gold,
    image: "crits/baldursGate/sarevmeowk.webp",
    description: "Boosts this floor's workers for 24s",
  },
  shadowpurr: {
    label: "Shadowpurr",
    color: COLOR.nightOwlIndigo,
    image: "crits/baldursGate/shadowpurr.webp",
    description: "One tier promotion and eleven upgrades here",
  },
  theEmpurror: {
    label: "The Empurror",
    color: COLOR.halloweenSalePurple,
    image: "crits/baldursGate/theEmpurror.webp",
    description: "Boosts every worker for 15s",
  },
  thisIsTheEnd: {
    label: "This Is The End",
    color: COLOR.luckyCloverGreen,
    image: "crits/baldursGate/thisIsTheEnd.webp",
    description: "Twenty-two free upgrades on this floor",
  },
  whiskerWyll: {
    label: "Whisker Wyll",
    color: COLOR.blue,
    image: "crits/baldursGate/whiskerWyll.webp",
    description: "Free office chairs and supplies for this floor",
  },
  winkWink: {
    label: "Wink Wink",
    color: COLOR.springSalePink,
    image: "crits/baldursGate/winkWink.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
} as const satisfies Record<string, FeaturedCritData>;
