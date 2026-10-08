import type { HACKING_CRITS } from "../critData/hacking";
import type { FeaturedRewards } from "./types";

export const HACKING_REWARDS = {
  wrenchWraith: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.wrenchWraithBoostSeconds, balance.wrenchWraithExtraWorkers),
  padlockPhantom: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.padlockPhantomContinueChance),
  binaryHood: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.binaryHoodDiscount),
  laptopLurker: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.laptopLurkerShare),
  lockpickLaptop: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.lockpickLaptopBoostSeconds, balance.lockpickLaptopExtraWorkers),
  spraycanSpecter: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.spraycanSpecterContinueChance),
  maskedIntruder: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.maskedIntruderDiscount),
  codeReaper: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.codeReaperShare),
  headphoneHeist: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.headphoneHeistBoostSeconds, balance.headphoneHeistExtraWorkers),
  circuitCrypt: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.circuitCryptContinueChance),
  usbCrossbones: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.usbCrossbonesBoostSeconds, balance.usbCrossbonesExtraWorkers),
  gasMaskGlitch: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.gasMaskGlitchContinueChance),
  crownedCoder: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.crownedCoderDiscount),
  bandanaBandit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bandanaBanditShare),
  pixelProwler: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.pixelProwlerBoostSeconds, balance.pixelProwlerExtraWorkers),
  keylockLich: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.keylockLichContinueChance),
  patchworkHelm: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.patchworkHelmDiscount),
  midnightKeystroke: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.midnightKeystrokeShare),
  glitchMask: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.glitchMaskBoostSeconds, balance.glitchMaskExtraWorkers),
  keyholeGhost: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.keyholeGhostContinueChance),
  neonCrossfire: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.neonCrossfireDiscount),
  pinkHoodPayload: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pinkHoodPayloadShare),
  codeTagCloak: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.codeTagCloakBoostSeconds, balance.codeTagCloakExtraWorkers),
  jollyRogerRoot: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.jollyRogerRootContinueChance),
  lockdownVisor: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.lockdownVisorDiscount),
  hoodieHex: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hoodieHexShare),
  rogueRadio: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.rogueRadioBoostSeconds, balance.rogueRadioExtraWorkers),
  goggleHoodRebel: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.goggleHoodRebelContinueChance),
  drippingDisguise: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.drippingDisguiseDiscount),
  chainedKeys: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.chainedKeysShare),
  terminalTerror: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.terminalTerrorBoostSeconds, balance.terminalTerrorExtraWorkers),
  codeCrush: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.codeCrushContinueChance),
  mugCommit: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.mugCommitDiscount),
  bugBrew: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.bugBrewShare),
  skullStackTrace: (context, { actions, balance }) =>
    actions.boostWorkers(context.floors, balance.skullStackTraceBoostSeconds, balance.skullStackTraceExtraWorkers),
  beanieBuild: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.beanieBuildContinueChance),
  anonymous: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.anonymousUpgrades),
  anonymousDonor: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.anonymousDonorMultiple),
  crossedMarkers: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.crossedMarkersShare, 2),
  graffitiMask: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.graffitiMaskShare, 1),
  headphoneHood: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.headphoneHoodShare, 2),
  laptopReaper: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.laptopReaperShare, 1),
  limeHoodie: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.limeHoodieShare, 2),
  magentaHood: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.magentaHoodShare, 1),
  neonTypist: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.neonTypistShare, 2),
  skullTagger: (context, { actions, balance }) =>
    actions.raiseWorkerTiers(context.floors, balance.skullTaggerShare, 1),
  usbHood: (context, { actions, balance }) =>
    actions.raiseWorkerTiers([context.floor], balance.usbHoodShare, 2),
} satisfies FeaturedRewards<typeof HACKING_CRITS>;
