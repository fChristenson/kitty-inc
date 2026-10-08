import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const WEIGHT_TRAINING_CRITS = {
  barbellBelle: {
    label: "Barbell Belle",
    color: COLOR.peppermintPink,
    image: "crits/weightTraining/barbellBelle.webp",
    description: "Locks every floor's upgrade price for 5s",
  },
  ponytailPress: {
    label: "Ponytail Press",
    color: COLOR.springSalePink,
    image: "crits/weightTraining/ponytailPress.webp",
    description: "Boosts every worker for 46s, counting as 1 extra worker",
  },
  glitterGrip: {
    label: "Glitter Grip",
    color: COLOR.grandOpeningRose,
    image: "crits/weightTraining/glitterGrip.webp",
    description: "Raises every floor below this one to its level",
  },
  curlCutie: {
    label: "Curl Cutie",
    color: COLOR.fullHouseCrimson,
    image: "crits/weightTraining/curlCutie.webp",
    description: "Raises every floor below this one to its level",
  },
  deadliftDiva: {
    label: "Deadlift Diva",
    color: COLOR.easterSalePink,
    image: "crits/weightTraining/deadliftDiva.webp",
    description: "Unlocks the next floor for free",
  },
  goldPlated: {
    label: "Gold Plated",
    color: COLOR.gold,
    image: "crits/weightTraining/goldPlated.webp",
    description: "Adds 105s of your company's income",
  },
  dumbbellDarling: {
    label: "Dumbbell Darling",
    color: COLOR.purple,
    image: "crits/weightTraining/dumbbellDarling.webp",
    description: "Seventy-eight payouts on the cheapest floor to upgrade",
  },
  gymCrush: {
    label: "Gym Crush",
    color: COLOR.teal,
    image: "crits/weightTraining/gymCrush.webp",
    description: "Boosts every worker for 37s",
  },
  ironHeartthrob: {
    label: "Iron Heartthrob",
    color: COLOR.fireDrillRed,
    image: "crits/weightTraining/ironHeartthrob.webp",
    description:
      "Two tier promotions and twenty-four upgrades on the top earner",
  },
  kettlebellKiss: {
    label: "Kettlebell Kiss",
    color: COLOR.coffeeRunTeal,
    image: "crits/weightTraining/kettlebellKiss.webp",
    description: "Seventy-three payouts on the lowest-level floor",
  },
  headbandHustle: {
    label: "Headband Hustle",
    color: COLOR.floorShareBlue,
    image: "crits/weightTraining/headbandHustle.webp",
    description: "Free office chairs for every unlocked floor",
  },
  proteinPrincess: {
    label: "Protein Princess",
    color: COLOR.heavenlyGold,
    image: "crits/weightTraining/proteinPrincess.webp",
    description:
      "One tier promotion and fifty-three upgrades on the highest floor",
  },
  shakerSovereign: {
    label: "Shaker Sovereign",
    color: COLOR.pairBlue,
    image: "crits/weightTraining/shakerSovereign.webp",
    description: "Boosts every worker for 53s, counting as 1 extra worker",
  },
  crownedChug: {
    label: "Crowned Chug",
    color: COLOR.fancyFridayIndigo,
    image: "crits/weightTraining/crownedChug.webp",
    description: "Boosts every worker for 53s, counting as 1 extra worker",
  },
  rackAndReady: {
    label: "Rack and Ready",
    color: COLOR.goldenHandshakeGold,
    image: "crits/weightTraining/rackAndReady.webp",
    description: "Forty-six upgrades here and on the cheapest floor",
  },
  overheadOkay: {
    label: "Overhead Okay",
    color: COLOR.bonusRoundGold,
    image: "crits/weightTraining/overheadOkay.webp",
    description: "Boosts every worker for 37s",
  },
  bluePlateSpecial: {
    label: "Blue Plate Special",
    color: COLOR.overflowBlue,
    image: "crits/weightTraining/bluePlateSpecial.webp",
    description: "Unlocks the next 2 floors for free",
  },
  barbellBow: {
    label: "Barbell Bow",
    color: COLOR.nightShiftIndigo,
    image: "crits/weightTraining/barbellBow.webp",
    description:
      "Two tier promotions and nineteen upgrades on the highest floor",
  },
  rackPullRiches: {
    label: "Rack Pull Riches",
    color: COLOR.sameBoatCoral,
    image: "crits/weightTraining/rackPullRiches.webp",
    description: "Raises alternating floors to the building's top level",
  },
  ringMyBell: {
    label: "Ring My Bell",
    color: COLOR.coinGold,
    image: "crits/weightTraining/ringMyBell.webp",
    description: "Hires 2 free workers and a manager on every unlocked floor",
  },
  goldBeltBudget: {
    label: "Gold Belt Budget",
    color: COLOR.overflowBlue,
    image: "crits/weightTraining/goldBeltBudget.webp",
    description: "Adds 88s of your company's income",
  },
  chinUp: {
    label: "Chin Up",
    color: COLOR.amberMuted,
    image: "crits/weightTraining/chinUp.webp",
    description: "Grows this floor's level by 12.2% in free upgrades",
  },
  formCheck: {
    label: "Form Check",
    color: COLOR.coinGold,
    image: "crits/weightTraining/formCheck.webp",
    description: "Grows this floor's level by 18.3% in free upgrades",
  },
  bearyBuff: {
    label: "Beary Buff",
    color: COLOR.chairGiveawayBrown,
    image: "crits/weightTraining/bearyBuff.webp",
    description: "Grows this floor's level by 26.7% in free upgrades",
  },
  labRatLifters: {
    label: "Lab Rat Lifters",
    color: COLOR.overflowBlue,
    image: "crits/weightTraining/labRatLifters.webp",
    description: "Grows this floor's level by 27% in free upgrades",
  },
  backpackBabes: {
    label: "Backpack Babes",
    color: COLOR.sameBoatCoral,
    image: "crits/weightTraining/backpackBabes.webp",
    description: "Adds 44.4% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
