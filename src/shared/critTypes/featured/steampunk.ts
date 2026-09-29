import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const STEAMPUNK_CRITS = {
  aetherLantern: {
    label: "Aether Lantern",
    color: COLOR.springCleaningMint,
    image: "crits/steampunk/aetherLantern.webp",
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
    image: "crits/steampunk/boilerRoom.webp",
    description: "Twenty-two free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.boilerRoomUpgrades),
  },
  brassDiver: {
    label: "Brass Diver",
    color: COLOR.supplyRunTan,
    image: "crits/steampunk/brassDiver.webp",
    description:
      "Repeats the crit on the floor above, 30% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.brassDiverContinueChance),
  },
  clockworkHand: {
    label: "Clockwork Hand",
    color: COLOR.bonusRoundGold,
    image: "crits/steampunk/clockworkHand.webp",
    description: "Boosts every worker for 16s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.clockworkHandBoostSeconds,
        balance.clockworkHandExtraWorkers,
      ),
  },
  cogwork: {
    label: "Cogwork",
    color: COLOR.mergerGold,
    image: "crits/steampunk/cogwork.webp",
    description: "Cuts every price in this building by 2.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cogworkDiscount),
  },
  fullSteam: {
    label: "Full Steam",
    color: COLOR.unionBossSlate,
    image: "crits/steampunk/fullSteam.webp",
    description: "Hires 2 free workers on this floor",
    reward: (context, { actions, balance }) =>
      actions.hireWorkers([context.floor], balance.fullSteamWorkers),
  },
  pocketWatch: {
    label: "Pocket Watch",
    color: COLOR.gold,
    image: "crits/steampunk/pocketWatch.webp",
    description: "Cuts every price in this building by 2.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.pocketWatchDiscount),
  },
  tubeDelivery: {
    label: "Tube Delivery",
    color: COLOR.goldenHandshakeGold,
    image: "crits/steampunk/tubeDelivery.webp",
    description: "Thirty-one upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.tubeDeliveryUpgrades),
  },
  windUp: {
    label: "Wind Up",
    color: COLOR.goldenTicketYellow,
    image: "crits/steampunk/windUp.webp",
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
    image: "crits/steampunk/clockworkSatellite.webp",
    description: "Cuts every price in this building by 2.7%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(
        context.floors,
        balance.clockworkSatelliteDiscount,
      ),
  },
  clockworkOwl: {
    label: "Clockwork Owl",
    color: COLOR.gold,
    image: "crits/steampunk/clockworkOwl.webp",
    description: "Cuts every price in this building by 2.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.clockworkOwlDiscount),
  },
  clockworkWizard2: {
    label: "Arcane Automaton",
    color: COLOR.blue,
    image: "crits/steampunk/clockworkWizard2.webp",
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
    image: "crits/steampunk/metalHeart.webp",
    description: "Thirty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.metalHeartUpgrades),
  },
  metalHeart2: {
    label: "Piston Paladin",
    color: COLOR.gold,
    image: "crits/steampunk/metalHeart2.webp",
    description: "Boosts every worker for 32s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.metalHeart2BoostSeconds,
        balance.metalHeart2ExtraWorkers,
      ),
  },
  clockworkWizard: {
    label: "Spellsprocket",
    color: COLOR.purple,
    image: "crits/steampunk/clockworkWizard.webp",
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
    image: "crits/steampunk/bulwark.webp",
    description: "Boosts every worker for 66s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.bulwarkBoostSeconds,
        balance.bulwarkExtraWorkers,
      ),
  },
  fullPlate: {
    label: "Ironclad Guarantee",
    color: COLOR.silverTicketGray,
    image: "crits/steampunk/fullPlate.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  overlord: {
    label: "Dread Sovereign",
    color: COLOR.fullHouseCrimson,
    image: "crits/steampunk/overlord.webp",
    description:
      "Repeats the crit above and below, 63% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.overlordContinueChance),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
