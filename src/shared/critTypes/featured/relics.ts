import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const RELICS_CRITS = {
  ancientRelic: {
    label: "Ancient Relic",
    color: COLOR.mergerGold,
    image: "crits/relics/ancientRelic.png",
    description: "Thirty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.ancientRelicPayouts),
  },
  geometricRelic: {
    label: "Geometric Relic",
    color: COLOR.mergerGold,
    image: "crits/relics/geometricRelic.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.geometricRelicPayouts),
  },
  emberKey: {
    label: "Ember Key",
    color: COLOR.red,
    image: "crits/relics/emberKey.png",
    description: "Thirty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.emberKeyUpgrades),
  },
  frostRune: {
    label: "Frost Rune",
    color: COLOR.frozenIceBlue,
    image: "crits/relics/frostRune.png",
    description: "Twenty-nine upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.frostRuneUpgrades,
      ),
  },
  memoryCrystal: {
    label: "Memory Crystal",
    color: COLOR.cyan,
    image: "crits/relics/memoryCrystal.png",
    description: "One tier promotion and twenty-one upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.memoryCrystalTierSteps,
        balance.memoryCrystalUpgrades,
      ),
  },
  neonBeaker: {
    label: "Neon Beaker",
    color: COLOR.teal,
    image: "crits/relics/neonBeaker.png",
    description: "Thirty-two payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.neonBeakerPayouts,
      ),
  },
  rainbowRelic: {
    label: "Rainbow Relic",
    color: COLOR.royalFlushPurple,
    image: "crits/relics/rainbowRelic.png",
    description: "One tier promotion and twenty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.rainbowRelicTierSteps,
        balance.rainbowRelicUpgrades,
      ),
  },
  whisperingOrb: {
    label: "Whispering Orb",
    color: COLOR.purple,
    image: "crits/relics/whisperingOrb.png",
    description: "One tier promotion and twenty-five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.whisperingOrbTierSteps,
        balance.whisperingOrbUpgrades,
      ),
  },
  lionKey: {
    label: "Lion Key",
    color: COLOR.goldenHandshakeGold,
    image: "crits/relics/lionKey.png",
    description: "One tier promotion and twenty-six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.lionKeyTierSteps,
        balance.lionKeyUpgrades,
      ),
  },
  restorationProject: {
    label: "Restoration Project",
    color: COLOR.gold,
    image: "crits/relics/restorationProject.png",
    description: "Thirty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.restorationProjectUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
