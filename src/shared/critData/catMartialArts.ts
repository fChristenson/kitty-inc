import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CAT_MARTIAL_ARTS_CRITS = {
  blackBeltBiscuit: {
    label: "Black Belt Biscuit",
    color: COLOR.coinGold,
    image: "crits/catMartialArts/blackBeltBiscuit.webp",
    description: "Cuts every price in this building by 15.7%",
  },
  dojoWink: {
    label: "Dojo Wink",
    color: COLOR.sameBoatCoral,
    image: "crits/catMartialArts/dojoWink.webp",
    description: "Adds 12.6% of your total income",
  },
  boStaffBoots: {
    label: "Bo Staff Boots",
    color: COLOR.orange,
    image: "crits/catMartialArts/boStaffBoots.webp",
    description: "Boosts every worker for 80s, counting as 2 extra workers",
  },
  karateKittyChop: {
    label: "Karate Kitty Chop",
    color: COLOR.orange,
    image: "crits/catMartialArts/karateKittyChop.webp",
    description: "Repeats the crit above and below, 91% chance to keep spreading",
  },
  kendoKitten: {
    label: "Kendo Kitten",
    color: COLOR.nightShiftIndigo,
    image: "crits/catMartialArts/kendoKitten.webp",
    description: "Cuts every price in this building by 15.8%",
  },
  kungFuWhiskers: {
    label: "Kung Fu Whiskers",
    color: COLOR.red,
    image: "crits/catMartialArts/kungFuWhiskers.webp",
    description: "Adds 12.7% of your total income",
  },
  muayThaiMeow: {
    label: "Muay Thai Meow",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/catMartialArts/muayThaiMeow.webp",
    description: "Boosts every worker for 81s, counting as 2 extra workers",
  },
  jabTabby: {
    label: "Jab Tabby",
    color: COLOR.redActive,
    image: "crits/catMartialArts/jabTabby.webp",
    description: "Repeats the crit above and below, 92% chance to keep spreading",
  },
  tigerTeepKick: {
    label: "Tiger Teep Kick",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/catMartialArts/tigerTeepKick.webp",
    description: "Cuts every price in this building by 15.9%",
  },
  ninjaPounce: {
    label: "Ninja Pounce",
    color: COLOR.sunshineGold,
    image: "crits/catMartialArts/ninjaPounce.webp",
    description: "Adds 12.9% of your total income",
  },
  samuraiScratch: {
    label: "Samurai Scratch",
    color: COLOR.redActive,
    image: "crits/catMartialArts/samuraiScratch.webp",
    description: "Boosts every worker for 83s, counting as 2 extra workers",
  },
  shogunWhiskers: {
    label: "Shogun Whiskers",
    color: COLOR.redActive,
    image: "crits/catMartialArts/shogunWhiskers.webp",
    description: "Repeats the crit above and below, 94% chance to keep spreading",
  },
  senseiWhiskers: {
    label: "Sensei Whiskers",
    color: COLOR.teaBreakBrown,
    image: "crits/catMartialArts/senseiWhiskers.webp",
    description: "Cuts every price in this building by 16.1%",
  },
  shaolinPurr: {
    label: "Shaolin Purr",
    color: COLOR.roundUpOrange,
    image: "crits/catMartialArts/shaolinPurr.webp",
    description: "Adds 13% of your total income",
  },
  sumoChonk: {
    label: "Sumo Chonk",
    color: COLOR.springCleaningMint,
    image: "crits/catMartialArts/sumoChonk.webp",
    description: "Boosts every worker for 84s, counting as 2 extra workers",
  },
  bellyBumpBanzai: {
    label: "Belly Bump Banzai",
    color: COLOR.coinGold,
    image: "crits/catMartialArts/bellyBumpBanzai.webp",
    description: "Repeats the crit above and below, 95% chance to keep spreading",
  },
  tailWhipKick: {
    label: "Tail Whip Kick",
    color: COLOR.amberMuted,
    image: "crits/catMartialArts/tailWhipKick.webp",
    description: "Cuts every price in this building by 16.3%",
  },
  tigerClawStance: {
    label: "Tiger Claw Stance",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/catMartialArts/tigerClawStance.webp",
    description: "Adds 13.2% of your total income",
  },
  goldenFurFury: {
    label: "Golden Fur Fury",
    color: COLOR.starYellow,
    image: "crits/catMartialArts/goldenFurFury.webp",
    description: "Promotes 60.5% of this building's workers one perma tier",
  },
  spikyBlueCat: {
    label: "Spiky Blue Cat",
    color: COLOR.fastForwardBlue,
    image: "crits/catMartialArts/spikyBlueCat.webp",
    description: "Promotes 83.5% of this floor's workers two perma tiers",
  },
  spikyManeKitty: {
    label: "Spiky Mane Kitty",
    color: COLOR.orange,
    image: "crits/catMartialArts/spikyManeKitty.webp",
    description: "Promotes 61% of this building's workers one perma tier",
  },
} as const satisfies Record<string, FeaturedCritData>;
