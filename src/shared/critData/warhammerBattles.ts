import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const WARHAMMER_BATTLES_CRITS = {
  emperorsFinest: {
    label: "Emperor's Finest",
    color: COLOR.blue,
    image: "crits/warhammerBattles/emperorsFinest.webp",
    description: "Thirty-seven payouts on every unlocked floor",
  },
  eternalDuty: {
    label: "Eternal Duty",
    color: COLOR.red,
    image: "crits/warhammerBattles/eternalDuty.webp",
    description: "Boosts every worker for 17s",
  },
  faithIsOurShield: {
    label: "Faith Is Our Shield",
    color: COLOR.blue,
    image: "crits/warhammerBattles/faithIsOurShield.webp",
    description: "One tier promotion and twenty-four upgrades here",
  },
  fearNotThePsyker: {
    label: "Fear Not the Psyker",
    color: COLOR.purple,
    image: "crits/warhammerBattles/fearNotThePsyker.webp",
    description:
      "Repeats the crit on the floor above, 37% chance to keep climbing",
  },
  neverSurrender: {
    label: "Never Surrender",
    color: COLOR.red,
    image: "crits/warhammerBattles/neverSurrender.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  purge: {
    label: "Purge",
    color: COLOR.red,
    image: "crits/warhammerBattles/purge.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  toTheSkies: {
    label: "To the Skies",
    color: COLOR.blue,
    image: "crits/warhammerBattles/toTheSkies.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  whatAreYourOrders: {
    label: "What Are Your Orders",
    color: COLOR.blue,
    image: "crits/warhammerBattles/whatAreYourOrders.webp",
    description: "Thirty free upgrades on the lowest-level floor",
  },
  emperorProvidesPurrfection: {
    label: "The Emperor Provides",
    color: COLOR.blue,
    image: "crits/warhammerBattles/emperorProvidesPurrfection.webp",
    description: "Forty-four instant payouts on every unlocked floor",
  },
  fortyKOfGold: {
    label: "40K of Gold",
    color: COLOR.gold,
    image: "crits/warhammerBattles/fortyKOfGold.webp",
    description: "Forty instant payouts on every unlocked floor",
  },
  chaoticTemptation: {
    label: "Chaotic Temptation",
    color: COLOR.red,
    image: "crits/warhammerBattles/chaoticTemptation.webp",
    description: "Unlocks the next floor for free",
  },
  chaoticTemptation2: {
    label: "Chaos Allure",
    color: COLOR.purple,
    image: "crits/warhammerBattles/chaoticTemptation2.webp",
    description: "Thirty-four free upgrades on this floor",
  },
  chaoticTemptation3: {
    label: "Chaos Romance",
    color: COLOR.orange,
    image: "crits/warhammerBattles/chaoticTemptation3.webp",
    description: "Thirty-six free upgrades on every other floor",
  },
  chaoticTemptation4: {
    label: "Chaos Jackpot",
    color: COLOR.heavenlyGold,
    image: "crits/warhammerBattles/chaoticTemptation4.webp",
    description: "Forty-two payouts from the highest-earning floor",
  },
  emperorsDividends: {
    label: "Praise The Emperor",
    color: COLOR.blue,
    image: "crits/warhammerBattles/emperorsDividends.webp",
    description: "Raises alternating floors to the building's top level",
  },
  heavyHitter: {
    label: "Heavy Hitter",
    color: COLOR.redActive,
    image: "crits/warhammerBattles/heavyHitter.webp",
    description: "Raises every floor to the building's top level",
  },
  iAmSpeed: {
    label: "I Am Speed",
    color: COLOR.cyan,
    image: "crits/warhammerBattles/iAmSpeed.webp",
    description: "Boosts every worker for 32s",
  },
  neverSurrender2: {
    label: "Never Yield",
    color: COLOR.fullHouseCrimson,
    image: "crits/warhammerBattles/neverSurrender2.webp",
    description: "Cuts every price in this building by 12.1%",
  },
  powerSword: {
    label: "Power Sword",
    color: COLOR.mysticTeal,
    image: "crits/warhammerBattles/powerSword.webp",
    description: "Two tier promotions and eighteen upgrades here",
  },
  powerSword2: {
    label: "Sword of the Emperor",
    color: COLOR.heavenlyGold,
    image: "crits/warhammerBattles/powerSword2.webp",
    description: "Hires 3 free workers and a manager on every unlocked floor",
  },
  cobaltJuggernaut: {
    label: "Cobalt Juggernaut",
    color: COLOR.nightOwlIndigo,
    image: "crits/warhammerBattles/cobaltJuggernaut.webp",
    description:
      "Repeats the crit on the floor below, 10% chance to keep falling",
  },
  bolterAim: {
    label: "Bolter Aim",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammerBattles/bolterAim.webp",
    description: "Promotes 87.5% of this floor's workers two perma tiers",
  },
  crimsonStare: {
    label: "Crimson Stare",
    color: COLOR.overflowBlue,
    image: "crits/warhammerBattles/crimsonStare.webp",
    description: "Promotes 65.5% of this building's workers one perma tier",
  },
  goldCrestBulk: {
    label: "Gold Crest Bulk",
    color: COLOR.overflowBlue,
    image: "crits/warhammerBattles/goldCrestBulk.webp",
    description: "Promotes 100% of this floor's workers two perma tiers",
  },
  redEyeGunner: {
    label: "Red Eye Gunner",
    color: COLOR.fastForwardBlue,
    image: "crits/warhammerBattles/redEyeGunner.webp",
    description: "Adds 35.5% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
