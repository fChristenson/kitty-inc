import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const STEAMPUNK_CRITS = {
  aetherLantern: {
    label: "Aether Lantern",
    color: COLOR.springCleaningMint,
    image: "crits/steampunk/aetherLantern.png",
    description: "Nineteen upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.aetherLanternUpgrades,
      ),
  },
  boilerRoom: {
    label: "Boiler Room",
    color: COLOR.headhunterRust,
    image: "crits/steampunk/boilerRoom.png",
    description: "Twenty-two free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.boilerRoomUpgrades),
  },
  brassDiver: {
    label: "Brass Diver",
    color: COLOR.supplyRunTan,
    image: "crits/steampunk/brassDiver.png",
    description: "Thirty-three instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.brassDiverPayouts),
  },
  clockworkHand: {
    label: "Clockwork Hand",
    color: COLOR.bonusRoundGold,
    image: "crits/steampunk/clockworkHand.png",
    description: "Sixteen upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.clockworkHandUpgrades),
  },
  cogwork: {
    label: "Cogwork",
    color: COLOR.mergerGold,
    image: "crits/steampunk/cogwork.png",
    description: "Twenty-nine payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.cogworkPayouts),
  },
  fullSteam: {
    label: "Full Steam",
    color: COLOR.unionBossSlate,
    image: "crits/steampunk/fullSteam.png",
    description: "Thirty-three free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.fullSteamUpgrades),
  },
  pocketWatch: {
    label: "Pocket Watch",
    color: COLOR.gold,
    image: "crits/steampunk/pocketWatch.png",
    description: "Twenty-nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.pocketWatchPayouts,
      ),
  },
  tubeDelivery: {
    label: "Tube Delivery",
    color: COLOR.goldenHandshakeGold,
    image: "crits/steampunk/tubeDelivery.png",
    description: "Thirty-one upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.tubeDeliveryUpgrades),
  },
  windUp: {
    label: "Wind Up",
    color: COLOR.goldenTicketYellow,
    image: "crits/steampunk/windUp.png",
    description: "One tier promotion and seventeen upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.windUpTierSteps,
        balance.windUpUpgrades,
      ),
  },
  clockworkSatellite: {
    label: "Clockwork Satellite",
    color: COLOR.blue,
    image: "crits/steampunk/clockworkSatellite.png",
    description: "Thirty upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.clockworkSatelliteUpgrades,
      ),
  },
  clockworkOwl: {
    label: "Clockwork Owl",
    color: COLOR.gold,
    image: "crits/steampunk/clockworkOwl.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.clockworkOwlUpgrades),
  },
  clockworkWizard2: {
    label: "Arcane Automaton",
    color: COLOR.blue,
    image: "crits/steampunk/clockworkWizard2.png",
    description: "Thirty-four free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.clockworkWizard2Upgrades,
      ),
  },
  metalHeart: {
    label: "Gearheart Guardian",
    color: COLOR.pairBlue,
    image: "crits/steampunk/metalHeart.png",
    description: "Thirty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.metalHeartUpgrades),
  },
  metalHeart2: {
    label: "Piston Paladin",
    color: COLOR.gold,
    image: "crits/steampunk/metalHeart2.png",
    description: "Forty-one payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.metalHeart2Payouts,
      ),
  },
  clockworkWizard: {
    label: "Spellsprocket",
    color: COLOR.purple,
    image: "crits/steampunk/clockworkWizard.png",
    description: "One tier promotion and twelve upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.clockworkWizardTierSteps,
        balance.clockworkWizardUpgrades,
      ),
  },
  bulwark: {
    label: "Hold the Line",
    color: COLOR.nightShiftIndigo,
    image: "crits/steampunk/bulwark.png",
    description: "Forty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bulwarkUpgrades),
  },
  fullPlate: {
    label: "Ironclad Guarantee",
    color: COLOR.silverTicketGray,
    image: "crits/steampunk/fullPlate.png",
    description: "Thirty-three upgrades on this floor and every floor below",
    reward: (context, { actions, balance }) =>
      actions.upgrade(
        context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
        balance.fullPlateUpgrades,
      ),
  },
  overlord: {
    label: "Dread Sovereign",
    color: COLOR.fullHouseCrimson,
    image: "crits/steampunk/overlord.png",
    description: "Forty-five instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.overlordPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
