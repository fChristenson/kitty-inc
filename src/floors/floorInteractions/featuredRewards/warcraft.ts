import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createWarcraftRewards({
  actions,
  balance,
}: RewardHelpers) {
  return {
    arfthas: (context) =>
      actions.upgrade([context.floor], balance.arfthasUpgrades),
    guldanMeow: (context) =>
      actions.payCycles([context.floor], balance.guldanMeowPayouts),
    sargerasPurrgeras: (context) =>
      actions.upgrade(context.floors, balance.sargerasPurrgerasUpgrades),
    sylvanwhisker: (context) =>
      actions.payCycles([context.floor], balance.sylvanwhiskerPayouts),
    sylvanasWhiskerunner: (context) =>
      actions.payCycles([context.floor], balance.sylvanasWhiskerunnerPayouts),
    jainaPurrmoore: (context) =>
      actions.upgrade([context.floor], balance.jainaPurrmooreUpgrades),
    thrallpaw: (context) =>
      actions.payCycles(context.floors, balance.thrallpawPayouts),
    varianWrynnkles: (context) =>
      actions.upgrade([context.floor], balance.varianWrynnklesUpgrades),
    anduinWrynncat: (context) =>
      actions.payCycles([context.floor], balance.anduinWrynncatPayouts),
    illidandelight: (context) =>
      actions.upgrade([context.floor], balance.illidandelightUpgrades),
    malfurionStormpaw: (context) =>
      actions.payCycles(context.floors, balance.malfurionStormpawPayouts),
    voljinWhisker: (context) =>
      actions.upgrade([context.floor], balance.voljinWhiskerUpgrades),
    lorthemewPurron: (context) =>
      actions.payCycles([context.floor], balance.lorthemewPurronPayouts),
    khadgarPurr: (context) =>
      actions.upgrade(context.floors, balance.khadgarPurrUpgrades),
    garroshHellscreamPurr: (context) =>
      actions.upgrade([context.floor], balance.garroshHellscreamPurrUpgrades),
    grommewHellscream: (context) =>
      actions.payCycles(context.floors, balance.grommewHellscreamPayouts),
    deathwingTheDestroycat: (context) =>
      actions.upgrade(context.floors, balance.deathwingTheDestroycatUpgrades),
    deathwingAshwing: (context) =>
      actions.upgrade([context.floor], balance.deathwingAshwingUpgrades),
    deathwingDestroypurr: (context) =>
      actions.upgrade(context.floors, balance.deathwingDestroypurrUpgrades),
    ragnapurrs: (context) =>
      actions.payCycles([context.floor], balance.ragnapurrsPayouts),
    medivhMewage: (context) =>
      actions.upgrade([context.floor], balance.medivhMewageUpgrades),
    tyrandeWhiskerwind: (context) =>
      actions.payCycles([context.floor], balance.tyrandeWhiskerwindPayouts),
    tyrandeMoonwhisker: (context) =>
      actions.payCycles([context.floor], balance.tyrandeMoonwhiskerPayouts),
    tyrandeWhisperpaws: (context) =>
      actions.payCycles(context.floors, balance.tyrandeWhisperpawsPayouts),
    tyrandeStarbow: (context) =>
      actions.upgrade([context.floor], balance.tyrandeStarbowUpgrades),
    chenStormstout: (context) =>
      actions.upgrade(context.floors, balance.chenStormstoutUpgrades),
    furionStormpaw: (context) =>
      actions.payCycles(context.floors, balance.furionStormpawPayouts),
    whatIsBrewing: (context) =>
      actions.payCycles([context.floor], balance.whatIsBrewingPayouts),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
