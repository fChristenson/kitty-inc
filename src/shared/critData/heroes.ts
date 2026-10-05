import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const HEROES_CRITS = {
  blessed: {
    label: "Blessed",
    color: COLOR.heavenlyGold,
    image: "crits/heroes/blessed.webp",
    description: "One tier promotion and three upgrades here",
  },
  centurion: {
    label: "Centurion",
    color: COLOR.red,
    image: "crits/heroes/centurion.webp",
    description: "Boosts every worker for 15s",
  },
  checkUp: {
    label: "Check Up",
    color: COLOR.cyan,
    image: "crits/heroes/checkUp.webp",
    description: "Four upgrades and two payouts on the lowest-level floor",
  },
  fireman: {
    label: "First Responder",
    color: COLOR.orange,
    image: "crits/heroes/fireman.webp",
    description: "Three upgrades, then one payout on every floor",
  },
  forTheEmperor: {
    label: "For the Emperor",
    color: COLOR.blue,
    image: "crits/heroes/forTheEmperor.webp",
    description: "Twenty-five upgrades on every unlocked floor",
  },
  forTheKing: {
    label: "For the King",
    color: COLOR.starYellow,
    image: "crits/heroes/forTheKing.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  hammerTime: {
    label: "Hammer Time",
    color: COLOR.red,
    image: "crits/heroes/hammerTime.webp",
    description: "Free office chairs for this floor",
  },
  robinHood: {
    label: "Honor among thieves",
    color: COLOR.moneyGreen,
    image: "crits/heroes/robinHood.webp",
    description: "Free office supplies for this floor",
  },
  roman: {
    label: "Roman Holiday",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/roman.webp",
    description: "Boosts this floor's workers for 22s",
  },
  samurai: {
    label: "Samurai",
    color: COLOR.fullHouseCrimson,
    image: "crits/heroes/samurai.webp",
    description: "Cuts every price in this building by 1.4%",
  },
  spy: {
    label: "Undercover",
    color: COLOR.nightShiftIndigo,
    image: "crits/heroes/spy.webp",
    description: "Boosts this floor's workers for 23s",
  },
  theLawWon: {
    label: "The Law Won",
    color: COLOR.blue,
    image: "crits/heroes/theLawWon.webp",
    description: "Cuts every price in this building by 1%",
  },
  victorian: {
    label: "High Society",
    color: COLOR.gold,
    image: "crits/heroes/victorian.webp",
    description: "Boosts this floor's workers for 22s",
  },
  uchihaItachi: {
    label: "Big brother",
    color: COLOR.doubleDownCrimson,
    image: "crits/heroes/uchihaItachi.webp",
    description: "Grows this floor's level by 12.1% in free upgrades",
  },
  geralt: {
    label: "Butcher of Blaviken",
    color: COLOR.easterSalePink,
    image: "crits/heroes/geralt.webp",
    description: "Grows this floor's level by 12.8% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
