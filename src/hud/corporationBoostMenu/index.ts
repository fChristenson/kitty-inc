import {
  formatPrice,
  animateDialogClose,
  triggerButtonPress,
} from "../../utils";
import {
  getAllCompaniesTotalIncome,
  spendFromAllCompanies,
} from "../../totalIncome";
import {
  startPressAndHold,
  type PressAndHoldController,
} from "../../shared/pressAndHold";
import { spawnFloatingLabel } from "../../shared/floatingLabel";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { getManagerIconUrl } from "../../floors";
import { gte, isZero } from "../../shared/bigNumber";

const coinIconUrl = getImageUrl("coin");
const shieldIconUrl = getImageUrl("shield");
const graphIconUrl = getImageUrl("graph");
import {
  getMinigameEntryCost,
  getFreePressConferenceCount,
  holdPressConference,
  beginInvestHold,
  investInMarket,
  formatBoostPercent,
} from "./economy";
import type { InvestHoldBudget } from "./economy";

export {
  getMinigameEntryCost,
  getFreePressConferenceCount,
  grantFreePressConference,
  holdPressConference,
  beginInvestHold,
  investInMarket,
  getCompanyBaseModifierPercent,
  getMarketInfluencePercent,
  addMarketInfluencePercent,
  getInvestmentPortfolioPercent,
  getSecuredAssetsPercent,
  addSecuredAssetsPercent,
  getTaxRebatePercent,
  addTaxRebatePercent,
  getAssetsMovedPercent,
  addAssetsMovedPercent,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
  formatBoostPercent,
  mergeCompanies,
} from "./economy";
export type { MergeCompaniesResult } from "./economy";

// reuses .worker-menu's styling — a dialog listing this company's various
// income-boost purchases/minigames (see render() below)
export function createCorporationBoostMenuMarkup(): string {
  return `
    <div class="worker-menu" id="corporation-boost-menu" hidden>
      <div class="worker-menu__backdrop" id="corporation-boost-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Corporation Boosts</h2>
        </div>
        <div class="worker-menu__list" id="corporation-boost-menu-list"></div>
      </div>
    </div>
  `;
}

export interface CorporationBoostMenu {
  open: () => void;
  close: () => void;
  refresh: () => void;
}

export function wireCorporationBoostMenu(
  container: HTMLElement,
  onPressConferenceHeld?: () => void,
  // opens the Liquidate Assets mini game (see hud/liquidateAssetsGame) — free
  // to play, unlike "Hold press conference" which costs $ up front; its own
  // reward is entirely performance-based (see that module's own influence gain)
  onOpenLiquidateAssets?: () => void,
  // opens the Declare Taxes mini game (see hud/payTaxes) — same up-front entry
  // cost/gating as the other two minigame buttons above
  onOpenPayTaxes?: () => void,
  // opens the Tax Haven mini game (see hud/taxHavenGame) — same up-front
  // entry cost/gating as every other minigame button above
  onOpenTaxHaven?: () => void,
): CorporationBoostMenu {
  const menu = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu",
  )!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu-list",
  )!;

  function render(): void {
    // list.innerHTML below tears down and rebuilds every node in the list —
    // including ones whose content didn't even change (a price/count label
    // ticking up elsewhere in the same list) — which resets scrollTop to 0
    // like any fresh DOM replacement does. Restoring it after is simpler and
    // far less fragile than trying to only touch the one button whose price
    // actually changed
    const scrollTop = list.scrollTop;
    const managerIconUrl = getManagerIconUrl();
    const minigameEntryCost = getMinigameEntryCost();
    const freePressConferenceCount = getFreePressConferenceCount();
    // computed once and reused below — getAllCompaniesTotalIncome() is itself
    // O(companies) (a localStorage read + JSON.parse per company), so calling
    // it again inside the per-company items loop made render() scale
    // O(companies^2)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const minigameEntryAffordable =
      freePressConferenceCount > 0 ||
      gte(allCompaniesTotalIncome, minigameEntryCost);
    const minigameEntryPriceLabel =
      freePressConferenceCount > 0
        ? `FREE (x${freePressConferenceCount})`
        : formatPrice(minigameEntryCost);
    // gated on there being anything at all left to invest — once every
    // company's total is fully drained there's genuinely nothing left for
    // 10% of $0 to spend
    const investAffordable = !isZero(allCompaniesTotalIncome);
    list.innerHTML = `
      <button
        class="worker-menu__item"
        id="press-conference-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${managerIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Hold press conference</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="liquidate-assets-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${shieldIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Secure stock price</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="declare-taxes-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Declare taxes</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="tax-haven-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Use tax haven</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="invest-in-market-item"
        ${investAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${graphIconUrl}" class="worker-menu__icon worker-menu__icon--graph" alt="" />
          <span class="worker-menu__item-name">Invest in the market</span>
        </span>
        <span class="worker-menu__price">10%</span>
      </button>
    `;
    list.scrollTop = scrollTop;
  }

  // press-and-hold auto-repeat for Invest in the market (this button isn't
  // keyed by company index, unlike a per-floor purchase elsewhere) — a fresh
  // beginInvestHold() snapshot is captured every time a hold starts, so
  // exactly 10 presses fully drains it (see economy.ts's investInMarket)
  const INVEST_HOLD_INTERVAL_MS = 100;
  let investHeld = false;
  let investHoldController: PressAndHoldController | null = null;
  let investHoldStartTotals: InvestHoldBudget | null = null;

  function stopInvestHold(): void {
    investHeld = false;
    investHoldController?.stop();
    investHoldController = null;
    investHoldStartTotals = null;
  }

  // patches just the disabled/afford states an invest press can change,
  // WITHOUT touching list.innerHTML — a full render() rebuild here (torn down
  // and recreated every ~100ms for as long as the hold lasts) was fighting
  // the browser's own native touch-scroll tracking on mobile, occasionally
  // yanking the list to a random scroll position mid-hold. corporationStats'
  // own breakdown (modifiers/per-company rates) refreshes itself while open
  function updateInvestDynamicValues(): void {
    updateAffordability();
  }

  function fireInvest(): void {
    if (!investHoldStartTotals) return;
    const gain = investInMarket(investHoldStartTotals);
    if (gain === null) {
      stopInvestHold();
      return;
    }
    playSold();
    updateInvestDynamicValues();
    const button = list.querySelector<HTMLButtonElement>(
      "#invest-in-market-item",
    );
    if (button) {
      void triggerButtonPress(button);
      spawnFloatingLabel(button, panel, formatBoostPercent(gain));
    }
  }

  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#invest-in-market-item");
    if (!button || button.disabled) return;
    stopInvestHold(); // safety net against a stale interrupted gesture
    investHeld = true;
    investHoldStartTotals = beginInvestHold();
    fireInvest();
    investHoldController = startPressAndHold(() => {
      if (!investHeld) return; // hold already stopped
      fireInvest();
    }, INVEST_HOLD_INTERVAL_MS);
  });

  window.addEventListener("pointerup", stopInvestHold);
  window.addEventListener("pointercancel", stopInvestHold);

  // single-shot (not press-and-hold, unlike the invest button above) —
  // one press conference at a time makes sense given its own 30-minute-income cost
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#press-conference-item");
    if (!button || button.disabled) return;
    if (!holdPressConference()) return;
    playSold();
    render();
    pauseAffordabilityPolling();
    onPressConferenceHeld?.();
  });

  // shows/costs the same as press conference (see minigameEntryPriceLabel in
  // render()) and is gated by the same affordability check, but (unlike the
  // free press conference) actually spends the cost itself right here —
  // there's no separate holdX-style helper for it since it doesn't touch the
  // free-conference credit pool
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#liquidate-assets-item");
    if (!button || button.disabled) return;
    if (!spendFromAllCompanies(getMinigameEntryCost())) return;
    playSold();
    pauseAffordabilityPolling();
    onOpenLiquidateAssets?.();
  });

  // same shared entry cost/spend pattern as liquidate-assets-item above
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#declare-taxes-item");
    if (!button || button.disabled) return;
    if (!spendFromAllCompanies(getMinigameEntryCost())) return;
    playSold();
    pauseAffordabilityPolling();
    onOpenPayTaxes?.();
  });

  // same shared entry cost/spend pattern as declare-taxes-item above
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#tax-haven-item");
    if (!button || button.disabled) return;
    if (!spendFromAllCompanies(getMinigameEntryCost())) return;
    playSold();
    pauseAffordabilityPolling();
    onOpenTaxHaven?.();
  });

  // re-checks affordability while the menu sits open, same as boostMenu.ts's own
  // updateAffordability, so a grayed-out item turns clickable again as soon as
  // income catches up instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    // same hoist-out-of-the-loop fix as render() above — getMinigameEntryCost()
    // itself calls getAllCompaniesIncomeRatePerSecond(), which for the active
    // company walks every one of its floors, so calling it separately for
    // each of the 4 minigame buttons below quadrupled that cost every single
    // tick of this interval (it keeps running even while a minigame is being
    // played on top of this still-open menu)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const minigameEntryCost = getMinigameEntryCost();
    const minigameEntryAffordable =
      getFreePressConferenceCount() > 0 ||
      gte(allCompaniesTotalIncome, minigameEntryCost);
    const pressConferenceButton = list.querySelector<HTMLButtonElement>(
      "#press-conference-item",
    );
    if (pressConferenceButton) {
      pressConferenceButton.disabled = !minigameEntryAffordable;
    }
    // shows/costs the same as press conference (see minigameEntryPriceLabel
    // in render()), so it's gated by the exact same affordability check
    const liquidateAssetsButton = list.querySelector<HTMLButtonElement>(
      "#liquidate-assets-item",
    );
    if (liquidateAssetsButton) {
      liquidateAssetsButton.disabled = !minigameEntryAffordable;
    }
    const declareTaxesButton = list.querySelector<HTMLButtonElement>(
      "#declare-taxes-item",
    );
    if (declareTaxesButton) {
      declareTaxesButton.disabled = !minigameEntryAffordable;
    }
    const taxHavenButton =
      list.querySelector<HTMLButtonElement>("#tax-haven-item");
    if (taxHavenButton) {
      taxHavenButton.disabled = !minigameEntryAffordable;
    }
    const investButton = list.querySelector<HTMLButtonElement>(
      "#invest-in-market-item",
    );
    if (investButton) {
      investButton.disabled = isZero(allCompaniesTotalIncome);
    }
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // stopped right as any minigame opens on top of this still-open menu —
  // otherwise this kept polling (and, worse, kept recomputing every
  // minigame button's own entry cost) every 250ms the whole time a game was
  // being played, competing with that game's own render loop for no visible
  // benefit (the menu is covered up the whole time anyway)
  function pauseAffordabilityPolling(): void {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function resumeAffordabilityPolling(): void {
    if (refreshInterval === null && !menu.hidden) {
      refreshInterval = setInterval(updateAffordability, 250);
    }
  }

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
    resumeAffordabilityPolling();
  }

  async function close(): Promise<void> {
    stopInvestHold();
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    pauseAffordabilityPolling();
  }

  backdrop.addEventListener("click", close);

  // called by main.ts once a minigame closes back to this menu — resumes the
  // polling pauseAffordabilityPolling stopped when that minigame opened
  function refresh(): void {
    render();
    resumeAffordabilityPolling();
  }

  return { open, close, refresh };
}
