import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BALDURS_GATE_CRITS = {
  astapurrion: {
    label: "Astapurrion",
    color: COLOR.fullHouseCrimson,
    image: "crits/baldursGate/astapurrion.webp",
    description: "Nineteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.astapurrionPayouts),
  },
  astralclawSkyblade: {
    label: "Astralclaw Skyblade",
    color: COLOR.red,
    image: "crits/baldursGate/astralclawSkyblade.webp",
    description: "Hires a free manager for this floor",
    reward: (context, { actions }) => actions.hireManagers([context.floor]),
  },
  drizztDoPurrden: {
    label: "Drizzt Do'Purrden",
    color: COLOR.cyan,
    image: "crits/baldursGate/drizztDoPurrden.webp",
    description: "Arms this floor's next click as an x5 crit",
    reward: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  },
  elmiaowster: {
    label: "Elmiaowster",
    color: COLOR.royalFlushPurple,
    image: "crits/baldursGate/elmiaowster.webp",
    description: "Two tier promotions and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.elmiaowsterTierSteps,
        balance.elmiaowsterUpgrades,
      ),
  },
  elvenSongblade: {
    label: "Elven Songblade",
    color: COLOR.pairBlue,
    image: "crits/baldursGate/elvenSongblade.webp",
    description: "Cuts every price in this building by 2.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.elvenSongbladeDiscount),
  },
  galepaw: {
    label: "Galepaw",
    color: COLOR.purple,
    image: "crits/baldursGate/galepaw.webp",
    description: "Eleven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.galepawPayouts),
  },
  halsinpaw: {
    label: "Halsinpaw",
    color: COLOR.dressCodeGreen,
    image: "crits/baldursGate/halsinpaw.webp",
    description: "Sixteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.halsinpawUpgrades),
  },
  hearthpawShadowagent: {
    label: "Hearthpaw Shadowagent",
    color: COLOR.nightShiftIndigo,
    image: "crits/baldursGate/hearthpawShadowagent.webp",
    description: "Twenty payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.hearthpawShadowagentPayouts,
      ),
  },
  imeown: {
    label: "Imeown",
    color: COLOR.peppermintPink,
    image: "crits/baldursGate/imeown.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  jaheirball: {
    label: "Jaheirball",
    color: COLOR.moneyGreen,
    image: "crits/baldursGate/jaheirball.webp",
    description: "Fourteen payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.jaheirballPayouts),
  },
  karlachonk: {
    label: "Karlachonk",
    color: COLOR.orange,
    image: "crits/baldursGate/karlachonk.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  laezclaw: {
    label: "Lae'zclaw",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/baldursGate/laezclaw.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  minscAndMeow: {
    label: "Minsc and Meow",
    color: COLOR.supplyRunTan,
    image: "crits/baldursGate/minscAndMeow.webp",
    description:
      "Repeats the crit on the floor above, 27% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.minscAndMeowContinueChance),
  },
  sarevmeowk: {
    label: "Sarevmeowk",
    color: COLOR.gold,
    image: "crits/baldursGate/sarevmeowk.webp",
    description: "Boosts this floor's workers for 24s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.sarevmeowkBoostSeconds,
        balance.sarevmeowkExtraWorkers,
      ),
  },
  shadowpurr: {
    label: "Shadowpurr",
    color: COLOR.nightOwlIndigo,
    image: "crits/baldursGate/shadowpurr.webp",
    description: "One tier promotion and eleven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.shadowpurrTierSteps,
        balance.shadowpurrUpgrades,
      ),
  },
  theEmpurror: {
    label: "The Empurror",
    color: COLOR.halloweenSalePurple,
    image: "crits/baldursGate/theEmpurror.webp",
    description: "Boosts every worker for 15s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.theEmpurrorBoostSeconds,
        balance.theEmpurrorExtraWorkers,
      ),
  },
  thisIsTheEnd: {
    label: "This Is The End",
    color: COLOR.luckyCloverGreen,
    image: "crits/baldursGate/thisIsTheEnd.webp",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.thisIsTheEndUpgrades),
  },
  whiskerWyll: {
    label: "Whisker Wyll",
    color: COLOR.blue,
    image: "crits/baldursGate/whiskerWyll.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  winkWink: {
    label: "Wink Wink",
    color: COLOR.springSalePink,
    image: "crits/baldursGate/winkWink.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
