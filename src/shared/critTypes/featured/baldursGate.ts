import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const BALDURS_GATE_CRITS = {
  astapurrion: {
    label: "Astapurrion",
    color: COLOR.fullHouseCrimson,
    image: "crits/baldursGate/astapurrion.png",
    description: "Nineteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.astapurrionPayouts),
  },
  astralclawSkyblade: {
    label: "Astralclaw Skyblade",
    color: COLOR.red,
    image: "crits/baldursGate/astralclawSkyblade.png",
    description: "Twenty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.astralclawSkybladeUpgrades),
  },
  drizztDoPurrden: {
    label: "Drizzt Do'Purrden",
    color: COLOR.cyan,
    image: "crits/baldursGate/drizztDoPurrden.png",
    description: "Nine upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.drizztDoPurrdenUpgrades),
  },
  elmiaowster: {
    label: "Elmiaowster",
    color: COLOR.royalFlushPurple,
    image: "crits/baldursGate/elmiaowster.png",
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
    image: "crits/baldursGate/elvenSongblade.png",
    description: "Twenty payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.elvenSongbladePayouts),
  },
  galepaw: {
    label: "Galepaw",
    color: COLOR.purple,
    image: "crits/baldursGate/galepaw.png",
    description: "Eleven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.galepawPayouts),
  },
  halsinpaw: {
    label: "Halsinpaw",
    color: COLOR.dressCodeGreen,
    image: "crits/baldursGate/halsinpaw.png",
    description: "Sixteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.halsinpawUpgrades),
  },
  hearthpawShadowagent: {
    label: "Hearthpaw Shadowagent",
    color: COLOR.nightShiftIndigo,
    image: "crits/baldursGate/hearthpawShadowagent.png",
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
    image: "crits/baldursGate/imeown.png",
    description: "Thirteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.imeownUpgrades),
  },
  jaheirball: {
    label: "Jaheirball",
    color: COLOR.moneyGreen,
    image: "crits/baldursGate/jaheirball.png",
    description: "Fourteen payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.jaheirballPayouts),
  },
  karlachonk: {
    label: "Karlachonk",
    color: COLOR.orange,
    image: "crits/baldursGate/karlachonk.png",
    description: "Twenty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.karlachonkUpgrades),
  },
  laezclaw: {
    label: "Lae'zclaw",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/baldursGate/laezclaw.png",
    description: "Nineteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.laezclawUpgrades),
  },
  minscAndMeow: {
    label: "Minsc and Meow",
    color: COLOR.supplyRunTan,
    image: "crits/baldursGate/minscAndMeow.png",
    description: "Eighteen free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.minscAndMeowUpgrades),
  },
  sarevmeowk: {
    label: "Sarevmeowk",
    color: COLOR.gold,
    image: "crits/baldursGate/sarevmeowk.png",
    description: "Fifteen upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.sarevmeowkUpgrades),
  },
  shadowpurr: {
    label: "Shadowpurr",
    color: COLOR.nightOwlIndigo,
    image: "crits/baldursGate/shadowpurr.png",
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
    image: "crits/baldursGate/theEmpurror.png",
    description: "Thirteen payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.theEmpurrorPayouts),
  },
  thisIsTheEnd: {
    label: "This Is The End",
    color: COLOR.luckyCloverGreen,
    image: "crits/baldursGate/thisIsTheEnd.png",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.thisIsTheEndUpgrades),
  },
  whiskerWyll: {
    label: "Whisker Wyll",
    color: COLOR.blue,
    image: "crits/baldursGate/whiskerWyll.png",
    description: "Nineteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.whiskerWyllPayouts,
      ),
  },
  winkWink: {
    label: "Wink Wink",
    color: COLOR.springSalePink,
    image: "crits/baldursGate/winkWink.png",
    description: "Fourteen free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.winkWinkUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
