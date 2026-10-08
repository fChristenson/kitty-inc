import type { WARCRAFT_CRITS } from "../critData/warcraft";
import type { FeaturedRewards } from "./types";

export const WARCRAFT_REWARDS = {
  arfthas: (context, { actions }) => {
    actions.giveOfficeChairs([context.floor]);
    actions.giveOfficeSupplies([context.floor]);
  },
  guldanMeow: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.guldanMeowDiscount),
  sargerasPurrgeras: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.sargerasPurrgerasUpgrades),
  sylvanwhisker: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.sylvanwhiskerContinueChance),
  sylvanasWhiskerunner: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sylvanasWhiskerunnerPayouts),
  jainaPurrmoore: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.jainaPurrmooreUpgrades),
  thrallpaw: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.thrallpawContinueChance),
  varianWrynnkles: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.varianWrynnklesContinueChance,
    ),
  anduinWrynncat: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.anduinWrynncatContinueChance),
  illidandelight: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.illidandelightDiscount),
  malfurionStormpaw: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "both",
      balance.malfurionStormpawContinueChance,
    ),
  voljinWhisker: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.voljinWhiskerDiscount),
  lorthemewPurron: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.lorthemewPurronPayouts),
  khadgarPurr: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.khadgarPurrUpgrades),
  garroshHellscreamPurr: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.garroshHellscreamPurrBoostSeconds,
      balance.garroshHellscreamPurrExtraWorkers,
    ),
  grommewHellscream: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.grommewHellscreamFloors),
  deathwingTheDestroycat: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.deathwingTheDestroycatFloors),
  deathwingAshwing: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.deathwingAshwingDiscount),
  deathwingDestroypurr: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.deathwingDestroypurrUpgrades),
  ragnapurrs: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.ragnapurrsBoostSeconds,
      balance.ragnapurrsExtraWorkers,
    ),
  medivhMewage: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.medivhMewageUpgrades),
  tyrandeWhiskerwind: (context, { actions, balance }) =>
    actions.repeatCrit(
      context,
      "up",
      balance.tyrandeWhiskerwindContinueChance,
    ),
  tyrandeMoonwhisker: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tyrandeMoonwhiskerPayouts),
  tyrandeWhisperpaws: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.tyrandeWhisperpawsPayouts),
  tyrandeStarbow: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.tyrandeStarbowContinueChance),
  chenStormstout: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.chenStormstoutUpgrades),
  furionStormpaw: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.furionStormpawContinueChance),
  whatIsBrewing: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.whatIsBrewingPayouts),
  grimVanguard: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.grimVanguardBoostSeconds,
      balance.grimVanguardExtraWorkers,
    ),
  lightforgedPaladin: (context, { actions }) =>
    actions.giveOfficeSupplies([context.floor]),
} satisfies FeaturedRewards<typeof WARCRAFT_CRITS>;
