import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const DEMON_GIRLS_CRITS = {
  hellfireHeartbreaker: {
    label: "Hellfire Heartbreaker",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/hellfireHeartbreaker.png",
    description: "One tier promotion and forty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.hellfireHeartbreakerTierSteps,
        balance.hellfireHeartbreakerUpgrades,
      ),
  },
  spadeTailSass: {
    label: "Spade Tail Sass",
    color: COLOR.red,
    image: "crits/demonGirls/spadeTailSass.png",
    description: "Sixty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.spadeTailSassUpgrades),
  },
  sinfullySolvent: {
    label: "Sinfully Solvent",
    color: COLOR.royalFlushPurple,
    image: "crits/demonGirls/sinfullySolvent.png",
    description: "Sixty-eight payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sinfullySolventPayouts,
      ),
  },
  slyStack: {
    label: "Sly Stack",
    color: COLOR.bonusRoundGold,
    image: "crits/demonGirls/slyStack.png",
    description: "Sixty-six instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.slyStackPayouts),
  },
  lavenderLounge: {
    label: "Lavender Lounge",
    color: COLOR.peppermintPink,
    image: "crits/demonGirls/lavenderLounge.png",
    description: "Sixty-six upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.lavenderLoungeUpgrades,
      ),
  },
  pitchforkCharmer: {
    label: "Pitchfork Charmer",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/pitchforkCharmer.png",
    description: "Thirty-five upgrades and thirty-seven payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.pitchforkCharmerUpgrades,
        balance.pitchforkCharmerPayouts,
      ),
  },
  scarletSaunter: {
    label: "Scarlet Saunter",
    color: COLOR.fireDrillRed,
    image: "crits/demonGirls/scarletSaunter.png",
    description: "Fifty-four upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.scarletSaunterUpgrades),
  },
  forkFlourish: {
    label: "Fork Flourish",
    color: COLOR.goldStandardAmber,
    image: "crits/demonGirls/forkFlourish.png",
    description: "Fifty-three payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.forkFlourishPayouts),
  },
  brimstoneBelle: {
    label: "Brimstone Belle",
    color: COLOR.autumnSaleAmber,
    image: "crits/demonGirls/brimstoneBelle.png",
    description: "Fifty payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.brimstoneBellePayouts),
  },
  flapperFlames: {
    label: "Flapper Flames",
    color: COLOR.amberMuted,
    image: "crits/demonGirls/flapperFlames.png",
    description: "Forty-six upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.flapperFlamesUpgrades),
  },
  sootAndSequins: {
    label: "Soot and Sequins",
    color: COLOR.nightShiftIndigo,
    image: "crits/demonGirls/sootAndSequins.png",
    description: "Fifty-nine upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.sootAndSequinsUpgrades),
  },
  impeccableTaste: {
    label: "Impeccable Taste",
    color: COLOR.mysticTeal,
    image: "crits/demonGirls/impeccableTaste.png",
    description: "Fifty-eight payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.impeccableTastePayouts),
  },
  heartsAflame: {
    label: "Hearts Aflame",
    color: COLOR.grandOpeningRose,
    image: "crits/demonGirls/heartsAflame.png",
    description: "Sixty-three upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.heartsAflameUpgrades),
  },
  finePrintFiend: {
    label: "Fine Print Fiend",
    color: COLOR.espressoShotBrown,
    image: "crits/demonGirls/finePrintFiend.png",
    description: "Sixty-four payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.finePrintFiendPayouts),
  },
  signedInScarlet: {
    label: "Signed in Scarlet",
    color: COLOR.fullHouseCrimson,
    image: "crits/demonGirls/signedInScarlet.png",
    description: "Sixty-two upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.signedInScarletUpgrades),
  },
  termsAndTemptations: {
    label: "Terms and Temptations",
    color: COLOR.chairGiveawayBrown,
    image: "crits/demonGirls/termsAndTemptations.png",
    description: "Sixty-three payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles(
        [highestFloor(context)],
        balance.termsAndTemptationsPayouts,
      ),
  },
  hotTake: {
    label: "Hot Take",
    color: COLOR.red,
    image: "crits/demonGirls/hotTake.png",
    description: "Sixty-one upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.hotTakeUpgrades),
  },
  coinFlambe: {
    label: "Coin Flambe",
    color: COLOR.goldenTicketYellow,
    image: "crits/demonGirls/coinFlambe.png",
    description: "Sixty-seven payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.coinFlambePayouts),
  },
  rivetRebel: {
    label: "Rivet Rebel",
    color: COLOR.silverTicketGray,
    image: "crits/demonGirls/rivetRebel.png",
    description: "Fifty-eight upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.rivetRebelUpgrades),
  },
  flickerGrin: {
    label: "Flicker Grin",
    color: COLOR.autumnSaleAmber,
    image: "crits/demonGirls/flickerGrin.png",
    description: "Sixty-eight payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.flickerGrinPayouts,
      ),
  },
  smolderEyes: {
    label: "Smolder Eyes",
    color: COLOR.goldStandardAmber,
    image: "crits/demonGirls/smolderEyes.png",
    description: "Forty-five upgrades here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.smolderEyesUpgrades,
      ),
  },
  crimsonGlare: {
    label: "Crimson Glare",
    color: COLOR.doubleDownCrimson,
    image: "crits/demonGirls/crimsonGlare.png",
    description: "Forty-one payouts here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.crimsonGlarePayouts,
      ),
  },
  midnightSideEye: {
    label: "Midnight Side-Eye",
    color: COLOR.nightShiftIndigo,
    image: "crits/demonGirls/midnightSideEye.png",
    description: "Thirty-nine upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.midnightSideEyeUpgrades,
      ),
  },
  amberStare: {
    label: "Amber Stare",
    color: COLOR.goldenHandshakeGold,
    image: "crits/demonGirls/amberStare.png",
    description:
      "Thirty-two upgrades and thirty-four payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.amberStareUpgrades,
        balance.amberStarePayouts,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
