import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CHROME_GIRLS_CRITS = {
  heartOfChrome: {
    label: "Heart of Chrome",
    color: COLOR.pairBlue,
    image: "crits/chromeGirls/heartOfChrome.png",
    description: "One tier promotion and forty-three upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.heartOfChromeTierSteps,
        balance.heartOfChromeUpgrades,
      ),
  },
  heartDrive: {
    label: "Heart Drive",
    color: COLOR.internSkyBlue,
    image: "crits/chromeGirls/heartDrive.png",
    description: "Seventy free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.heartDriveUpgrades),
  },
  chromeCrush: {
    label: "Chrome Crush",
    color: COLOR.fullHouseCrimson,
    image: "crits/chromeGirls/chromeCrush.png",
    description:
      "Thirty-three upgrades and thirty-five payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.chromeCrushUpgrades,
        balance.chromeCrushPayouts,
      ),
  },
  heartBeam: {
    label: "Heart Beam",
    color: COLOR.peppermintPink,
    image: "crits/chromeGirls/heartBeam.png",
    description: "Sixty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.heartBeamPayouts),
  },
  puckerProtocol: {
    label: "Pucker Protocol",
    color: COLOR.red,
    image: "crits/chromeGirls/puckerProtocol.png",
    description: "Forty-four payouts here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.payCycles(
        hereAnd(context, selectByRate(context, false)),
        balance.puckerProtocolPayouts,
      ),
  },
  alloyAngel: {
    label: "Alloy Angel",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chromeGirls/alloyAngel.png",
    description: "Two tier promotions and nineteen upgrades on the top earner",
    reward: (context, { balance, promoteAndUpgrade, selectByRate }) =>
      promoteAndUpgrade(
        selectByRate(context, true),
        balance.alloyAngelTierSteps,
        balance.alloyAngelUpgrades,
      ),
  },
  sereneSeraph: {
    label: "Serene Seraph",
    color: COLOR.white,
    image: "crits/chromeGirls/sereneSeraph.png",
    description: "Fifty-one payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.sereneSeraphPayouts),
  },
  wingedWealth: {
    label: "Winged Wealth",
    color: COLOR.bonusRoundGold,
    image: "crits/chromeGirls/wingedWealth.png",
    description: "Forty-seven upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.wingedWealthUpgrades),
  },
  cyberSiren: {
    label: "Cyber Siren",
    color: COLOR.royalFlushPurple,
    image: "crits/chromeGirls/cyberSiren.png",
    description: "Seventy payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.cyberSirenPayouts,
      ),
  },
  micDropMaven: {
    label: "Mic Drop Maven",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromeGirls/micDropMaven.png",
    description: "Sixty-eight upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.micDropMavenUpgrades,
      ),
  },
  circuitSerenade: {
    label: "Circuit Serenade",
    color: COLOR.mysticTeal,
    image: "crits/chromeGirls/circuitSerenade.png",
    description: "Sixty upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.circuitSerenadeUpgrades),
  },
  chromeCrooner: {
    label: "Chrome Crooner",
    color: COLOR.pairBlue,
    image: "crits/chromeGirls/chromeCrooner.png",
    description: "Fifty-nine payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.chromeCroonerPayouts),
  },
  sunkissedSignal: {
    label: "Sunkissed Signal",
    color: COLOR.autumnSaleAmber,
    image: "crits/chromeGirls/sunkissedSignal.png",
    description: "Sixty-five payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.sunkissedSignalPayouts),
  },
  wiredWarble: {
    label: "Wired Warble",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/chromeGirls/wiredWarble.png",
    description: "Sixty-five upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.wiredWarbleUpgrades),
  },
  beltItOut: {
    label: "Belt It Out",
    color: COLOR.doubleDownCrimson,
    image: "crits/chromeGirls/beltItOut.png",
    description: "Sixty-four payouts on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.payCycles([highestFloor(context)], balance.beltItOutPayouts),
  },
  glossyGaze: {
    label: "Glossy Gaze",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/glossyGaze.png",
    description: "Sixty-four upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.glossyGazeUpgrades),
  },
  goldenFreckles: {
    label: "Golden Freckles",
    color: COLOR.goldenTicketYellow,
    image: "crits/chromeGirls/goldenFreckles.png",
    description: "Sixty-eight payouts on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.payCycles([cheapest(context)], balance.goldenFrecklesPayouts),
  },
  mirrorBob: {
    label: "Mirror Bob",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/mirrorBob.png",
    description: "Sixty-two upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.mirrorBobUpgrades),
  },
  holoHeart: {
    label: "Holo Heart",
    color: COLOR.internSkyBlue,
    image: "crits/chromeGirls/holoHeart.png",
    description: "Fifty-nine upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.holoHeartUpgrades),
  },
  pixelHeart: {
    label: "Pixel Heart",
    color: COLOR.grandOpeningRose,
    image: "crits/chromeGirls/pixelHeart.png",
    description: "Sixty-nine payouts on the lowest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, false)],
        balance.pixelHeartPayouts,
      ),
  },
  heartProjection: {
    label: "Heart Projection",
    color: COLOR.mysticTeal,
    image: "crits/chromeGirls/heartProjection.png",
    description: "Fifty-four payouts on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.payCycles(belowAndHere(context), balance.heartProjectionPayouts),
  },
  liquidMetalLashes: {
    label: "Liquid Metal Lashes",
    color: COLOR.fastForwardBlue,
    image: "crits/chromeGirls/liquidMetalLashes.png",
    description: "Forty-six upgrades here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.upgrade(
        hereAnd(context, highestFloor(context)),
        balance.liquidMetalLashesUpgrades,
      ),
  },
  dripAndDazzle: {
    label: "Drip and Dazzle",
    color: COLOR.goldenHandshakeGold,
    image: "crits/chromeGirls/dripAndDazzle.png",
    description: "Forty-two payouts here and on the highest floor",
    reward: (context, { actions, balance, hereAnd, highestFloor }) =>
      actions.payCycles(
        hereAnd(context, highestFloor(context)),
        balance.dripAndDazzlePayouts,
      ),
  },
  silverPour: {
    label: "Silver Pour",
    color: COLOR.silverTicketGray,
    image: "crits/chromeGirls/silverPour.png",
    description:
      "Thirty upgrades and thirty-two payouts on the highest unlocked floor",
    reward: (context, { balance, highestFloor, upgradeAndPay }) =>
      upgradeAndPay(
        [highestFloor(context)],
        balance.silverPourUpgrades,
        balance.silverPourPayouts,
      ),
  },
  polishedPout: {
    label: "Polished Pout",
    color: COLOR.red,
    image: "crits/chromeGirls/polishedPout.png",
    description: "Thirty-six upgrades and thirty-eight payouts on this floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        [context.floor],
        balance.polishedPoutUpgrades,
        balance.polishedPoutPayouts,
      ),
  },
  loweredLenses: {
    label: "Lowered Lenses",
    color: COLOR.nightShiftIndigo,
    image: "crits/chromeGirls/loweredLenses.png",
    description: "Forty upgrades here and on the lowest-earning floor",
    reward: (context, { actions, balance, hereAnd, selectByRate }) =>
      actions.upgrade(
        hereAnd(context, selectByRate(context, false)),
        balance.loweredLensesUpgrades,
      ),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
