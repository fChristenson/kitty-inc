import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const HACKING_CRITS = {
  wrenchWraith: {
    label: "Wrench Wraith",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/hacking/wrenchWraith.webp",
    description: "Boosts every worker for 61s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.wrenchWraithBoostSeconds, balance.wrenchWraithExtraWorkers),
  },
  padlockPhantom: {
    label: "Padlock Phantom",
    color: COLOR.teal,
    image: "crits/hacking/padlockPhantom.webp",
    description: "Repeats the crit on the floor below, 68% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.padlockPhantomContinueChance),
  },
  binaryHood: {
    label: "Binary Hood",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/hacking/binaryHood.webp",
    description: "Cuts every price in this building by 12%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.binaryHoodDiscount),
  },
  laptopLurker: {
    label: "Laptop Lurker",
    color: COLOR.cyan,
    image: "crits/hacking/laptopLurker.webp",
    description: "Adds 11.4% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.laptopLurkerShare),
  },
  lockpickLaptop: {
    label: "Lockpick Laptop",
    color: COLOR.cyan,
    image: "crits/hacking/lockpickLaptop.webp",
    description: "Boosts every worker for 63s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.lockpickLaptopBoostSeconds, balance.lockpickLaptopExtraWorkers),
  },
  spraycanSpecter: {
    label: "Spraycan Specter",
    color: COLOR.cyan,
    image: "crits/hacking/spraycanSpecter.webp",
    description: "Repeats the crit on the floor above, 69% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.spraycanSpecterContinueChance),
  },
  maskedIntruder: {
    label: "Masked Intruder",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/maskedIntruder.webp",
    description: "Cuts every price in this building by 12.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.maskedIntruderDiscount),
  },
  codeReaper: {
    label: "Code Reaper",
    color: COLOR.rainCheckBlue,
    image: "crits/hacking/codeReaper.webp",
    description: "Adds 11.5% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.codeReaperShare),
  },
  headphoneHeist: {
    label: "Headphone Heist",
    color: COLOR.peppermintPink,
    image: "crits/hacking/headphoneHeist.webp",
    description: "Boosts every worker for 65s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.headphoneHeistBoostSeconds, balance.headphoneHeistExtraWorkers),
  },
  circuitCrypt: {
    label: "Circuit Crypt",
    color: COLOR.peppermintPink,
    image: "crits/hacking/circuitCrypt.webp",
    description: "Repeats the crit on the floor below, 69% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.circuitCryptContinueChance),
  },
  usbCrossbones: {
    label: "USB Crossbones",
    color: COLOR.fullHouseCrimson,
    image: "crits/hacking/usbCrossbones.webp",
    description: "Boosts every worker for 67s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.usbCrossbonesBoostSeconds, balance.usbCrossbonesExtraWorkers),
  },
  gasMaskGlitch: {
    label: "Gas Mask Glitch",
    color: COLOR.internSkyBlue,
    image: "crits/hacking/gasMaskGlitch.webp",
    description: "Repeats the crit on the floor above, 70% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.gasMaskGlitchContinueChance),
  },
  crownedCoder: {
    label: "Crowned Coder",
    color: COLOR.peppermintPink,
    image: "crits/hacking/crownedCoder.webp",
    description: "Cuts every price in this building by 12.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.crownedCoderDiscount),
  },
  bandanaBandit: {
    label: "Bandana Bandit",
    color: COLOR.cyan,
    image: "crits/hacking/bandanaBandit.webp",
    description: "Adds 11.6% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bandanaBanditShare),
  },
  pixelProwler: {
    label: "Pixel Prowler",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/pixelProwler.webp",
    description: "Boosts every worker for 70s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.pixelProwlerBoostSeconds, balance.pixelProwlerExtraWorkers),
  },
  keylockLich: {
    label: "Keylock Lich",
    color: COLOR.peppermintPink,
    image: "crits/hacking/keylockLich.webp",
    description: "Repeats the crit on the floor below, 70% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.keylockLichContinueChance),
  },
  patchworkHelm: {
    label: "Patchwork Helm",
    color: COLOR.internSkyBlue,
    image: "crits/hacking/patchworkHelm.webp",
    description: "Cuts every price in this building by 12.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.patchworkHelmDiscount),
  },
  midnightKeystroke: {
    label: "Midnight Keystroke",
    color: COLOR.cyan,
    image: "crits/hacking/midnightKeystroke.webp",
    description: "Adds 11.7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.midnightKeystrokeShare),
  },
  glitchMask: {
    label: "Glitch Mask",
    color: COLOR.internSkyBlue,
    image: "crits/hacking/glitchMask.webp",
    description: "Boosts every worker for 72s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.glitchMaskBoostSeconds, balance.glitchMaskExtraWorkers),
  },
  keyholeGhost: {
    label: "Keyhole Ghost",
    color: COLOR.teal,
    image: "crits/hacking/keyholeGhost.webp",
    description: "Repeats the crit above and below, 81% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.keyholeGhostContinueChance),
  },
  neonCrossfire: {
    label: "Neon Crossfire",
    color: COLOR.suppliesGiveawayLime,
    image: "crits/hacking/neonCrossfire.webp",
    description: "Cuts every price in this building by 15.1%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.neonCrossfireDiscount),
  },
  pinkHoodPayload: {
    label: "Pink Hood Payload",
    color: COLOR.peppermintPink,
    image: "crits/hacking/pinkHoodPayload.webp",
    description: "Adds 11.8% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pinkHoodPayloadShare),
  },
  codeTagCloak: {
    label: "Code Tag Cloak",
    color: COLOR.overflowBlue,
    image: "crits/hacking/codeTagCloak.webp",
    description: "Boosts every worker for 74s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.codeTagCloakBoostSeconds, balance.codeTagCloakExtraWorkers),
  },
  jollyRogerRoot: {
    label: "Jolly Roger Root",
    color: COLOR.cyan,
    image: "crits/hacking/jollyRogerRoot.webp",
    description: "Repeats the crit above and below, 82% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.jollyRogerRootContinueChance),
  },
  lockdownVisor: {
    label: "Lockdown Visor",
    color: COLOR.internSkyBlue,
    image: "crits/hacking/lockdownVisor.webp",
    description: "Cuts every price in this building by 15.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.lockdownVisorDiscount),
  },
  hoodieHex: {
    label: "Hoodie Hex",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/hoodieHex.webp",
    description: "Adds 12% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.hoodieHexShare),
  },
  rogueRadio: {
    label: "Rogue Radio",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/rogueRadio.webp",
    description: "Boosts every worker for 75s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.rogueRadioBoostSeconds, balance.rogueRadioExtraWorkers),
  },
  goggleHoodRebel: {
    label: "Goggle Hood Rebel",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/goggleHoodRebel.webp",
    description: "Repeats the crit above and below, 83% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.goggleHoodRebelContinueChance),
  },
  drippingDisguise: {
    label: "Dripping Disguise",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/drippingDisguise.webp",
    description: "Cuts every price in this building by 15.3%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.drippingDisguiseDiscount),
  },
  chainedKeys: {
    label: "Chained Keys",
    color: COLOR.peppermintPink,
    image: "crits/hacking/chainedKeys.webp",
    description: "Adds 12.1% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chainedKeysShare),
  },
  terminalTerror: {
    label: "Terminal Terror",
    color: COLOR.fancyFridayIndigo,
    image: "crits/hacking/terminalTerror.webp",
    description: "Boosts every worker for 76s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.terminalTerrorBoostSeconds, balance.terminalTerrorExtraWorkers),
  },
  codeCrush: {
    label: "Code Crush",
    color: COLOR.internSkyBlue,
    image: "crits/hacking/codeCrush.webp",
    description: "Repeats the crit above and below, 85% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.codeCrushContinueChance),
  },
  mugCommit: {
    label: "Mug Commit",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/mugCommit.webp",
    description: "Cuts every price in this building by 15.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.mugCommitDiscount),
  },
  bugBrew: {
    label: "Bug Brew",
    color: COLOR.overflowBlue,
    image: "crits/hacking/bugBrew.webp",
    description: "Adds 12.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.bugBrewShare),
  },
  skullStackTrace: {
    label: "Skull Stack Trace",
    color: COLOR.rainCheckBlue,
    image: "crits/hacking/skullStackTrace.webp",
    description: "Boosts every worker for 77s, counting as 2 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.skullStackTraceBoostSeconds, balance.skullStackTraceExtraWorkers),
  },
  beanieBuild: {
    label: "Beanie Build",
    color: COLOR.fastForwardBlue,
    image: "crits/hacking/beanieBuild.webp",
    description: "Repeats the crit above and below, 86% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.beanieBuildContinueChance),
  },
  anonymous: {
    label: "Anonymous",
    color: COLOR.overflowBlue,
    image: "crits/hacking/anonymous.webp",
    description: "Spreads 53 free upgrades over this floor and the ones below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.spreadUpgrades(belowAndHere(context), balance.anonymousUpgrades),
  },
  anonymousDonor: {
    label: "Black hat",
    color: COLOR.overflowBlue,
    image: "crits/hacking/anonymousDonor.webp",
    description: "Pays 20 times the highest floor's upgrade price in cash",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.addUpgradePriceCash([highestFloor(context)], balance.anonymousDonorMultiple),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
