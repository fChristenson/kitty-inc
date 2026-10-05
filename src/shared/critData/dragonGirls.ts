import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const DRAGON_GIRLS_CRITS = {
  crimsonTailCoil: {
    label: "Crimson Tail Coil",
    color: COLOR.redActive,
    image: "crits/dragonGirls/crimsonTailCoil.webp",
    description: "Repeats the crit on the floor below, 86% chance to keep falling",
  },
  tangerineTailGrip: {
    label: "Tangerine Tail Grip",
    color: COLOR.roundUpOrange,
    image: "crits/dragonGirls/tangerineTailGrip.webp",
    description: "Cuts every price in this building by 18.2%",
  },
  tealTailSwagger: {
    label: "Teal Tail Swagger",
    color: COLOR.rainCheckBlue,
    image: "crits/dragonGirls/tealTailSwagger.webp",
    description: "Adds 48s of your company's income",
  },
  sapphireTailSway: {
    label: "Sapphire Tail Sway",
    color: COLOR.fastForwardBlue,
    image: "crits/dragonGirls/sapphireTailSway.webp",
    description: "Boosts every worker for 137s, counting as 3 extra workers",
  },
  scarletCrouchCoil: {
    label: "Scarlet Crouch Coil",
    color: COLOR.redActive,
    image: "crits/dragonGirls/scarletCrouchCoil.webp",
    description: "Repeats the crit on the floor above, 87% chance to keep climbing",
  },
  azureSquatSwish: {
    label: "Azure Squat Swish",
    color: COLOR.fastForwardBlue,
    image: "crits/dragonGirls/azureSquatSwish.webp",
    description: "Cuts every price in this building by 18.3%",
  },
  ceruleanCrouch: {
    label: "Cerulean Crouch",
    color: COLOR.springCleaningMint,
    image: "crits/dragonGirls/ceruleanCrouch.webp",
    description: "Adds 50s of your company's income",
  },
  jadeSquatSpikes: {
    label: "Jade Squat Spikes",
    color: COLOR.paydayEmerald,
    image: "crits/dragonGirls/jadeSquatSpikes.webp",
    description: "Boosts every worker for 139s, counting as 3 extra workers",
  },
  cherryCrouchWyrm: {
    label: "Cherry Crouch Wyrm",
    color: COLOR.redActive,
    image: "crits/dragonGirls/cherryCrouchWyrm.webp",
    description: "Repeats the crit on the floor below, 87% chance to keep falling",
  },
} as const satisfies Record<string, FeaturedCritData>;
