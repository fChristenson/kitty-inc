import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const STEAMPUNK_CRITS = {
  aetherLantern: {
    label: "Aether Lantern",
    color: COLOR.springCleaningMint,
    image: "crits/steampunk/aetherLantern.webp",
    description: "Nineteen upgrades on this floor and every floor below",
  },
  boilerRoom: {
    label: "Boiler Room",
    color: COLOR.headhunterRust,
    image: "crits/steampunk/boilerRoom.webp",
    description: "Twenty-two free upgrades on the lowest-level floor",
  },
  brassDiver: {
    label: "Brass Diver",
    color: COLOR.supplyRunTan,
    image: "crits/steampunk/brassDiver.webp",
    description:
      "Repeats the crit on the floor above, 30% chance to keep climbing",
  },
  clockworkHand: {
    label: "Clockwork Hand",
    color: COLOR.bonusRoundGold,
    image: "crits/steampunk/clockworkHand.webp",
    description: "Boosts every worker for 16s",
  },
  cogwork: {
    label: "Cogwork",
    color: COLOR.mergerGold,
    image: "crits/steampunk/cogwork.webp",
    description: "Cuts every price in this building by 2.6%",
  },
  fullSteam: {
    label: "Full Steam",
    color: COLOR.unionBossSlate,
    image: "crits/steampunk/fullSteam.webp",
    description: "Hires 2 free workers on this floor",
  },
  pocketWatch: {
    label: "Pocket Watch",
    color: COLOR.gold,
    image: "crits/steampunk/pocketWatch.webp",
    description: "Cuts every price in this building by 2.3%",
  },
  tubeDelivery: {
    label: "Tube Delivery",
    color: COLOR.goldenHandshakeGold,
    image: "crits/steampunk/tubeDelivery.webp",
    description: "Thirty-one upgrades on the highest unlocked floor",
  },
  windUp: {
    label: "Wind Up",
    color: COLOR.goldenTicketYellow,
    image: "crits/steampunk/windUp.webp",
    description: "One tier promotion and seventeen upgrades here",
  },
  clockworkSatellite: {
    label: "Clockwork Satellite",
    color: COLOR.blue,
    image: "crits/steampunk/clockworkSatellite.webp",
    description: "Cuts every price in this building by 2.7%",
  },
  clockworkOwl: {
    label: "Clockwork Owl",
    color: COLOR.gold,
    image: "crits/steampunk/clockworkOwl.webp",
    description: "Cuts every price in this building by 2.5%",
  },
  clockworkWizard2: {
    label: "Arcane Automaton",
    color: COLOR.blue,
    image: "crits/steampunk/clockworkWizard2.webp",
    description: "Thirty-four free upgrades on the highest unlocked floor",
  },
  metalHeart: {
    label: "Gearheart Guardian",
    color: COLOR.pairBlue,
    image: "crits/steampunk/metalHeart.webp",
    description: "Thirty-six free upgrades on this floor",
  },
  metalHeart2: {
    label: "Piston Paladin",
    color: COLOR.gold,
    image: "crits/steampunk/metalHeart2.webp",
    description: "Boosts every worker for 32s",
  },
  clockworkWizard: {
    label: "Spellsprocket",
    color: COLOR.purple,
    image: "crits/steampunk/clockworkWizard.webp",
    description: "One tier promotion and twelve upgrades here",
  },
  bulwark: {
    label: "Hold the Line",
    color: COLOR.nightShiftIndigo,
    image: "crits/steampunk/bulwark.webp",
    description: "Boosts every worker for 66s, counting as 2 extra workers",
  },
  fullPlate: {
    label: "Ironclad Guarantee",
    color: COLOR.silverTicketGray,
    image: "crits/steampunk/fullPlate.webp",
    description: "Hires a free manager for this floor",
  },
  overlord: {
    label: "Dread Sovereign",
    color: COLOR.fullHouseCrimson,
    image: "crits/steampunk/overlord.webp",
    description:
      "Repeats the crit above and below, 63% chance to keep spreading",
  },
} as const satisfies Record<string, FeaturedCritData>;
