import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const FRONTIERS_CRITS = {
  blackHole: {
    label: "Black Hole",
    color: COLOR.royalFlushPurple,
    image: "crits/frontiers/blackHole.webp",
    description: "Hires a free manager for this floor",
  },
  bottledNebula: {
    label: "Bottled Nebula",
    color: COLOR.halloweenSalePurple,
    image: "crits/frontiers/bottledNebula.webp",
    description: "One tier promotion and sixteen upgrades here",
  },
  eclipse: {
    label: "Eclipse",
    color: COLOR.orange,
    image: "crits/frontiers/eclipse.webp",
    description: "Arms the lowest-level floor's next click as an x5 crit",
  },
  joinTheDots: {
    label: "Join The Dots",
    color: COLOR.fastForwardBlue,
    image: "crits/frontiers/joinTheDots.webp",
    description: "Grows this floor's level by 19.9% in free upgrades",
  },
  blueBladeTabby: {
    label: "Blue Blade Tabby",
    color: COLOR.supplyRunTan,
    image: "crits/frontiers/blueBladeTabby.webp",
    description: "Grows this floor's level by 27.1% in free upgrades",
  },
  brassBikini: {
    label: "Brass Bikini",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/frontiers/brassBikini.webp",
    description: "Grows this floor's level by 27.2% in free upgrades",
  },
  crimsonEyes: {
    label: "Crimson Eyes",
    color: COLOR.redActive,
    image: "crits/frontiers/crimsonEyes.webp",
    description: "Grows this floor's level by 27.3% in free upgrades",
  },
  crimsonGauntlets: {
    label: "Crimson Gauntlets",
    color: COLOR.sameBoatCoral,
    image: "crits/frontiers/crimsonGauntlets.webp",
    description: "Grows this floor's level by 27.4% in free upgrades",
  },
  goldenGaze: {
    label: "Golden Gaze",
    color: COLOR.red,
    image: "crits/frontiers/goldenGaze.webp",
    description: "Grows this floor's level by 27.5% in free upgrades",
  },
  hoodedMenace: {
    label: "Hooded Menace",
    color: COLOR.chairGiveawayBrown,
    image: "crits/frontiers/hoodedMenace.webp",
    description: "Adds 107s of your company's income",
  },
  midnightCape: {
    label: "Midnight Cape",
    color: COLOR.nightShiftIndigo,
    image: "crits/frontiers/midnightCape.webp",
    description: "Grows this floor's level by 27.6% in free upgrades",
  },
  padawanPaws: {
    label: "Padawan Paws",
    color: COLOR.nightShiftIndigo,
    image: "crits/frontiers/padawanPaws.webp",
    description: "Adds 108s of your company's income",
  },
  redSaberRaise: {
    label: "Red Saber Raise",
    color: COLOR.fullHouseCrimson,
    image: "crits/frontiers/redSaberRaise.webp",
    description: "Grows this floor's level by 27.7% in free upgrades",
  },
  sinisterSmirk: {
    label: "Sinister Smirk",
    color: COLOR.doubleDownCrimson,
    image: "crits/frontiers/sinisterSmirk.webp",
    description: "Adds 109s of your company's income",
  },
  tentacleTresses: {
    label: "Tentacle Tresses",
    color: COLOR.rainCheckBlue,
    image: "crits/frontiers/tentacleTresses.webp",
    description: "Grows this floor's level by 27.8% in free upgrades",
  },
  treasureMap: {
    label: "Treasure Map",
    color: COLOR.supplyRunTan,
    image: "crits/frontiers/treasureMap.webp",
    description: "Adds 12s of your company's income",
  },
  captainLeFluff: {
    label: "Captain Le Fluff",
    color: COLOR.fullHouseCrimson,
    image: "crits/frontiers/captainLeFluff.webp",
    description: "Twenty-eight upgrades on the highest unlocked floor",
  },
  divingBell: {
    label: "Deep Dive",
    color: COLOR.goldenHandshakeGold,
    image: "crits/frontiers/divingBell.webp",
    description: "Two free upgrades cascading down from this floor",
  },
  flooringInspector: {
    label: "Flooring Inspector",
    color: COLOR.autumnSaleAmber,
    image: "crits/frontiers/flooringInspector.webp",
    description: "Fifteen upgrades on this floor and every floor below",
  },
  kraken: {
    label: "Kraken",
    color: COLOR.royalFlushPurple,
    image: "crits/frontiers/kraken.webp",
    description: "Twenty-seven payouts on every unlocked floor",
  },
  messageInABottle: {
    label: "Message in a Bottle",
    color: COLOR.threeOfAKindGreen,
    image: "crits/frontiers/messageInABottle.webp",
    description: "Arms this floor's next click as an x5 crit",
  },
  lemonSails: {
    label: "Lemon Sails",
    color: COLOR.starYellow,
    image: "crits/frontiers/lemonSails.webp",
    description: "Grows this floor's level by 20% in free upgrades",
  },
} as const satisfies Record<string, FeaturedCritData>;
