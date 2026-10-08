import { COLOR } from "../../../palette";
import type { FeaturedCritData } from "./types";

export const TREASURE_AND_FORTUNES_CRITS = {
  adamWhiskersen: {
    label: "Adam Whiskersen",
    color: COLOR.goldStandardAmber,
    image: "crits/treasureAndFortunes/adamWhiskersen.webp",
    description: "Two tier promotions and eight upgrades here",
  },
  bobPawge: {
    label: "Bob Pawge",
    color: COLOR.nightShiftIndigo,
    image: "crits/treasureAndFortunes/bobPawge.webp",
    description: "Unlocks the next floor for free",
  },
  bullionStack: {
    label: "Bullion Brigade",
    color: COLOR.gold,
    image: "crits/treasureAndFortunes/bullionStack.webp",
    description: "Adds 12s of your company's income",
  },
  gemMine: {
    label: "Gem Mine",
    color: COLOR.pairBlue,
    image: "crits/treasureAndFortunes/gemMine.webp",
    description: "Adds 3.9% of your total income",
  },
  goldMine: {
    label: "Gold Mine",
    color: COLOR.supplyRunTan,
    image: "crits/treasureAndFortunes/goldMine.webp",
    description: "Adds 7s of your company's income",
  },
  goldenChalice: {
    label: "Golden Chalice",
    color: COLOR.sunshineGold,
    image: "crits/treasureAndFortunes/goldenChalice.webp",
    description: "Two tier promotions and seven upgrades here",
  },
  goldenGoose: {
    label: "Golden Goose",
    color: COLOR.goldenTicketYellow,
    image: "crits/treasureAndFortunes/goldenGoose.webp",
    description: "Adds 5.5% of your total income",
  },
  goldenStag: {
    label: "Golden Stag",
    color: COLOR.heavenlyGold,
    image: "crits/treasureAndFortunes/goldenStag.webp",
    description: "Adds 11s of your company's income",
  },
  handsomeJake: {
    label: "Handsome Jake",
    color: COLOR.orange,
    image: "crits/treasureAndFortunes/handsomeJake.webp",
    description: "Hires 1 free worker on this floor",
  },
  jcDentclaw: {
    label: "JC Dentclaw",
    color: COLOR.nightOwlIndigo,
    image: "crits/treasureAndFortunes/jcDentclaw.webp",
    description: "Twenty-six free upgrades on this floor",
  },
  midasTouch: {
    label: "Midas Touch",
    color: COLOR.goldStandardAmber,
    image: "crits/treasureAndFortunes/midasTouch.webp",
    description: "One tier promotion and thirteen upgrades here",
  },
  nuggetAvalanche: {
    label: "Nugget Avalanche",
    color: COLOR.amber,
    image: "crits/treasureAndFortunes/nuggetAvalanche.webp",
    description: "Seventeen instant payouts on this floor",
  },
  purrDenton: {
    label: "Purr Denton",
    color: COLOR.fastForwardBlue,
    image: "crits/treasureAndFortunes/purrDenton.webp",
    description: "Seventeen free upgrades on the lowest-level floor",
  },
  strikeItRich: {
    label: "Strike It Rich",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/treasureAndFortunes/strikeItRich.webp",
    description: "Free office chairs for this floor",
  },
  wishingWell: {
    label: "Wishing Well",
    color: COLOR.rainCheckBlue,
    image: "crits/treasureAndFortunes/wishingWell.webp",
    description: "Arms the highest floor's next click as an x5 crit",
  },
  youKnowWhatStallion: {
    label: "You Know What, Stallion",
    color: COLOR.royalFlushPurple,
    image: "crits/treasureAndFortunes/youKnowWhatStallion.webp",
    description: "Boosts this floor's workers for 25s",
  },
  goldBar: {
    label: "Gold Bar",
    color: COLOR.gold,
    image: "crits/treasureAndFortunes/goldBar.webp",
    description: "Free office chairs for every unlocked floor",
  },
  gildedCache: {
    label: "Gilded Cache",
    color: COLOR.gold,
    image: "crits/treasureAndFortunes/gildedCache.webp",
    description: "Free office chairs and supplies for this floor",
  },
  executiveEscalator: {
    label: "Executive Escalator",
    color: COLOR.fastForwardBlue,
    image: "crits/treasureAndFortunes/executiveEscalator.webp",
    description: "Boosts every worker for 54s, counting as 1 extra worker",
  },
  gildedGong: {
    label: "Gilded Gong",
    color: COLOR.bonusRoundGold,
    image: "crits/treasureAndFortunes/gildedGong.webp",
    description: "Raises every floor below this one to its level",
  },
  overtimeOracle: {
    label: "Overtime Oracle",
    color: COLOR.dressCodeGreen,
    image: "crits/treasureAndFortunes/overtimeOracle.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
  paperworkPaladin: {
    label: "Paperwork Paladin",
    color: COLOR.red,
    image: "crits/treasureAndFortunes/paperworkPaladin.webp",
    description: "Sixty upgrades on the cheapest floor to upgrade",
  },
  profitPretzel: {
    label: "Profit Pretzel",
    color: COLOR.goldStandardAmber,
    image: "crits/treasureAndFortunes/profitPretzel.webp",
    description:
      "Repeats the crit on the floor above, 61% chance to keep climbing",
  },
  sovereignSnowglobe: {
    label: "Sovereign Snowglobe",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasureAndFortunes/sovereignSnowglobe.webp",
    description:
      "One tier promotion and thirty-nine upgrades on the top earner",
  },
  velvetLockbox: {
    label: "Velvet Lockbox",
    color: COLOR.doubleDownCrimson,
    image: "crits/treasureAndFortunes/velvetLockbox.webp",
    description: "Cuts every price in this building by 7.9%",
  },
} as const satisfies Record<string, FeaturedCritData>;
