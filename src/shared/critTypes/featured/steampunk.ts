import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const STEAMPUNK_CRIT_INFO = {
  aetherLantern: {
    label: "Aether Lantern",
    color: COLOR.springCleaningMint,
    icon: "aetherLantern",
    description: "Nineteen upgrades on this floor and every floor below",
  },
  boilerRoom: {
    label: "Boiler Room",
    color: COLOR.headhunterRust,
    icon: "boilerRoom",
    description: "Twenty-two free upgrades on the lowest-level floor",
  },
  brassDiver: {
    label: "Brass Diver",
    color: COLOR.supplyRunTan,
    icon: "brassDiver",
    description: "Thirty-three instant payouts on this floor",
  },
  clockworkHand: {
    label: "Clockwork Hand",
    color: COLOR.bonusRoundGold,
    icon: "clockworkHand",
    description: "Sixteen upgrades on alternating floors",
  },
  cogwork: {
    label: "Cogwork",
    color: COLOR.mergerGold,
    icon: "cogwork",
    description: "Twenty-nine payouts on every unlocked floor",
  },
  fullSteam: {
    label: "Full Steam",
    color: COLOR.unionBossSlate,
    icon: "fullSteam",
    description: "Thirty-three free upgrades on every unlocked floor",
  },
  pocketWatch: {
    label: "Pocket Watch",
    color: COLOR.gold,
    icon: "pocketWatch",
    description: "Twenty-nine payouts from the highest-earning floor",
  },
  tubeDelivery: {
    label: "Tube Delivery",
    color: COLOR.goldenHandshakeGold,
    icon: "tubeDelivery",
    description: "Thirty-one upgrades on the highest unlocked floor",
  },
  windUp: {
    label: "Wind Up",
    color: COLOR.goldenTicketYellow,
    icon: "windUp",
    description: "One tier promotion and seventeen upgrades here",
  },
  clockworkSatellite: {
    label: "Clockwork Satellite",
    color: COLOR.blue,
    icon: "clockworkSatellite",
    description: "Thirty upgrades on the highest unlocked floor",
  },
  clockworkOwl: {
    label: "Clockwork Owl",
    color: COLOR.gold,
    icon: "clockworkOwl",
    description: "Twenty-seven free upgrades on this floor",
  },
  clockworkWizard2: {
    label: "Arcane Automaton",
    color: COLOR.blue,
    icon: "clockworkWizard2",
    description: "Thirty-four free upgrades on the highest unlocked floor",
  },
  metalHeart: {
    label: "Gearheart Guardian",
    color: COLOR.pairBlue,
    icon: "metalHeart",
    description: "Thirty-six free upgrades on this floor",
  },
  metalHeart2: {
    label: "Piston Paladin",
    color: COLOR.gold,
    icon: "metalHeart2",
    description: "Forty-one payouts from the highest-earning floor",
  },
  clockworkWizard: {
    label: "Spellsprocket",
    color: COLOR.purple,
    icon: "clockworkWizard",
    description: "One tier promotion and twelve upgrades here",
  },
  bulwark: {
    label: "Hold the Line",
    color: COLOR.nightShiftIndigo,
    icon: "bulwark",
    description: "Forty-three free upgrades on this floor",
  },
  fullPlate: {
    label: "Ironclad Guarantee",
    color: COLOR.silverTicketGray,
    icon: "fullPlate",
    description: "Thirty-three upgrades on this floor and every floor below",
  },
  overlord: {
    label: "Dread Sovereign",
    color: COLOR.fullHouseCrimson,
    icon: "overlord",
    description: "Forty-five instant payouts on every unlocked floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
