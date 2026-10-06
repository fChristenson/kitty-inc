import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const RESCUE_SQUAD_CRITS = {
  bedsideManner: {
    label: "Bedside Manner",
    color: COLOR.overflowBlue,
    image: "crits/rescueSquad/bedsideManner.webp",
    description: "Adds 43.9% of your total income",
  },
  houseCall: {
    label: "House Call",
    color: COLOR.summerSaleOrange,
    image: "crits/rescueSquad/houseCall.webp",
    description: "Adds 44% of your total income",
  },
  scrubsUp: {
    label: "Scrubs Up",
    color: COLOR.sameBoatCoral,
    image: "crits/rescueSquad/scrubsUp.webp",
    description: "Adds 44.1% of your total income",
  },
  stethoscopes: {
    label: "Stethoscopes",
    color: COLOR.overflowBlue,
    image: "crits/rescueSquad/stethoscopes.webp",
    description: "Adds 44.2% of your total income",
  },
  pinkScrubs: {
    label: "Pink Scrubs",
    color: COLOR.fastForwardBlue,
    image: "crits/rescueSquad/pinkScrubs.webp",
    description: "Adds 63.8% of your total income",
  },
  headMirror: {
    label: "Head Mirror",
    color: COLOR.amberMuted,
    image: "crits/rescueSquad/headMirror.webp",
    description: "Grows this floor's level by 19.6% in free upgrades",
  },
  kneeJerk: {
    label: "Knee Jerk",
    color: COLOR.summerSaleOrange,
    image: "crits/rescueSquad/kneeJerk.webp",
    description: "Spreads 164 free upgrades over the lowest-level floors",
  },
  scrubbedIn: {
    label: "Scrubbed In",
    color: COLOR.teal,
    image: "crits/rescueSquad/scrubbedIn.webp",
    description: "Grows this floor's level by 19.7% in free upgrades",
  },
  blazeBusters: {
    label: "Blaze Busters",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/rescueSquad/blazeBusters.webp",
    description: "Adds 41.5% of your total income",
  },
  fireBrigade: {
    label: "Fire Brigade",
    color: COLOR.headhunterRust,
    image: "crits/rescueSquad/fireBrigade.webp",
    description: "Adds 41.6% of your total income",
  },
  helmetHeroes: {
    label: "Helmet Heroes",
    color: COLOR.gold,
    image: "crits/rescueSquad/helmetHeroes.webp",
    description: "Adds 41.7% of your total income",
  },
  backwardGlance: {
    label: "Backward Glance",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/backwardGlance.webp",
    description: "Spreads 173 free upgrades over the lowest-level floors",
  },
  beatCopBiceps: {
    label: "Beat Cop Biceps",
    color: COLOR.overflowBlue,
    image: "crits/rescueSquad/beatCopBiceps.webp",
    description: "Grows this floor's level by 20.6% in free upgrades",
  },
  bustedBurglar: {
    label: "Busted Burglar",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/bustedBurglar.webp",
    description: "Spreads 174 free upgrades over the lowest-level floors",
  },
  closeShave: {
    label: "Close Shave",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/closeShave.webp",
    description: "Grows this floor's level by 20.7% in free upgrades",
  },
  greenCollar: {
    label: "Green Collar",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/greenCollar.webp",
    description: "Spreads 175 free upgrades over the lowest-level floors",
  },
  nightstick: {
    label: "Nightstick",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/nightstick.webp",
    description: "Grows this floor's level by 20.8% in free upgrades",
  },
  ravenCurls: {
    label: "Raven Curls",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/ravenCurls.webp",
    description: "Spreads 176 free upgrades over the lowest-level floors",
  },
  silverShield: {
    label: "Silver Shield",
    color: COLOR.nightShiftIndigo,
    image: "crits/rescueSquad/silverShield.webp",
    description: "Grows this floor's level by 20.9% in free upgrades",
  },
  topBrass: {
    label: "Top Brass",
    color: COLOR.overflowBlue,
    image: "crits/rescueSquad/topBrass.webp",
    description: "Spreads 177 free upgrades over the lowest-level floors",
  },
  goggledGrunt: {
    label: "Goggled Grunt",
    color: COLOR.payoutOlive,
    image: "crits/rescueSquad/goggledGrunt.webp",
    description: "Promotes 63.5% of this building's workers one perma tier",
  },
  greenSkullTrooper: {
    label: "Green Skull Trooper",
    color: COLOR.luckyCloverGreen,
    image: "crits/rescueSquad/greenSkullTrooper.webp",
    description: "Promotes 86.5% of this floor's workers two perma tiers",
  },
  wreathedSkullHelm: {
    label: "Wreathed Skull Helm",
    color: COLOR.payoutOlive,
    image: "crits/rescueSquad/wreathedSkullHelm.webp",
    description: "Promotes 64% of this building's workers one perma tier",
  },
} as const satisfies Record<string, FeaturedCritData>;
