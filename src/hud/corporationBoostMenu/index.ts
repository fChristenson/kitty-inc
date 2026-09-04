import {
  formatPrice,
  formatTotalIncomeFull,
  animateDialogClose,
  triggerButtonPress,
} from "../../utils";
import { getAllCompaniesTotalIncome } from "../../totalIncome";
import { getCorporationName } from "../../corporationName";
import { getActiveCorporationIndices } from "../../company";
import {
  startPressAndHold,
  type PressAndHoldController,
} from "../../shared/pressAndHold";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { getManagerIconUrl } from "../../floors";
import { gte, lt, isZero, type BigNumber } from "../../shared/bigNumber";

const coinIconUrl = getImageUrl("coin");
import {
  buyStockRaise,
  getStockRaiseCost,
  getStockTimesBought,
  getStockContributionPercent,
  getCompanyBaseModifierPercent,
  getPressConferenceCost,
  getFreePressConferenceCount,
  holdPressConference,
  getInvestCost,
  investInMarket,
  getMarketInfluencePercent,
  getInvestmentPortfolioPercent,
  getGlobalIncomeBoostPercent,
  formatBoostPercent,
} from "./economy";

export {
  clearStockPrices,
  getStockTimesBought,
  getStockRaiseCost,
  buyStockRaise,
  getPressConferenceCost,
  getFreePressConferenceCount,
  grantFreePressConference,
  holdPressConference,
  getInvestCost,
  investInMarket,
  getMarketInfluencePercent,
  addMarketInfluencePercent,
  getInvestmentPortfolioPercent,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
  mergeCompanies,
} from "./economy";
export type { MergeCompaniesResult } from "./economy";

// reuses .worker-menu's styling — a dialog listing every corporation's own
// "raise stock price" purchase, one item per company (see render() below)
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
    // company.ts's getActiveCorporationIndices is the single source of truth
    // for "which companies still exist" — excludes anything merged away (see
    // corporationUpgradeMenu's "Merge" action)
    const activeIndices = getActiveCorporationIndices();
    const modifierRows = activeIndices
      .map((i) => ({
        name: getCorporationName(i),
        pct: getStockContributionPercent(i) + getCompanyBaseModifierPercent(i),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        ({ name, pct }) => `
        <div class="worker-menu__modifier-row">
          <span>${name}</span>
          <span data-modifier-name="${name}">${formatBoostPercent(pct)}</span>
        </div>
      `,
      )
      .join("");
    const marketInfluencePct = getMarketInfluencePercent();
    const marketInfluenceRow = `
      <div class="worker-menu__modifier-row">
        <span>Market influence</span>
        <span>${formatBoostPercent(marketInfluencePct)}</span>
      </div>
    `;
    const investmentPortfolioPct = getInvestmentPortfolioPercent();
    const investmentPortfolioRow = `
      <div class="worker-menu__modifier-row worker-menu__modifier-row--divider">
        <span>Investment portfolio</span>
        <span data-investment-portfolio-value>${formatBoostPercent(investmentPortfolioPct)}</span>
      </div>
    `;
    const totalPct = getGlobalIncomeBoostPercent();
    const pressConferenceCost = getPressConferenceCost();
    const freePressConferenceCount = getFreePressConferenceCount();
    // computed once and reused below — getAllCompaniesTotalIncome() is itself
    // O(companies) (a localStorage read + JSON.parse per company), so calling
    // it again inside the per-company items loop made render() scale
    // O(companies^2)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const pressConferenceAffordable =
      freePressConferenceCount > 0 ||
      gte(allCompaniesTotalIncome, pressConferenceCost);
    const pressConferencePriceLabel =
      freePressConferenceCount > 0
        ? `FREE (x${freePressConferenceCount})`
        : formatPrice(pressConferenceCost);
    const investCost = getInvestCost(currentInvestReference());
    // gated on cost > 0 (i.e. there's still something left to invest) rather
    // than always-enabled — once corp assets are fully drained there's
    // genuinely nothing left for 10% of $0 to spend
    const investAffordable =
      !isZero(investCost) && gte(allCompaniesTotalIncome, investCost);
    const items = activeIndices
      .map((i) => {
        const cost = getStockRaiseCost(i);
        const affordable = gte(allCompaniesTotalIncome, cost);
        return `
        <button
          class="worker-menu__item"
          data-company-index="${i}"
          ${affordable ? "" : "disabled"}
        >
          <span class="worker-menu__item-label">
            <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
            <span class="worker-menu__item-name">${getCorporationName(i)}</span>
            <span class="worker-menu__item-count">(x${getStockTimesBought(i)})</span>
          </span>
          <span class="worker-menu__price">${formatPrice(cost)}</span>
        </button>
      `;
      })
      .join("");
    list.innerHTML = `
      <h3 class="worker-menu__subheader">Corporation assets</h3>
      <span class="worker-menu__total-income">${formatTotalIncomeFull(allCompaniesTotalIncome)}</span>
      <h3 class="worker-menu__subheader">Income modifiers</h3>
      ${marketInfluenceRow}
      ${investmentPortfolioRow}
      ${modifierRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span data-total-boost-value>${formatBoostPercent(totalPct)}</span>
      </div>
      <h3 class="worker-menu__subheader">Boost Income Modifiers</h3>
      <button
        class="worker-menu__item"
        id="press-conference-item"
        ${pressConferenceAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${managerIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Hold press conference</span>
        </span>
        <span class="worker-menu__price">${pressConferencePriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="invest-in-market-item"
        ${investAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Invest in the market</span>
        </span>
        <span class="worker-menu__price">10%</span>
      </button>
      <h3 class="worker-menu__subheader">Raise Stock price</h3>
      ${items}
    `;
    list.scrollTop = scrollTop;
  }

  // press-and-hold auto-repeat (same interval as gameCanvas.ts's upgrade
  // button): pointerdown buys once immediately and starts repeating;
  // pointerup/cancel anywhere stops it. Tracks by company INDEX, not the
  // button element itself, since every render() call replaces every button node
  const STOCK_HOLD_INTERVAL_MS = 100;
  let heldCompanyIndex: number | null = null;
  let holdController: PressAndHoldController | null = null;

  function stopHold(): void {
    heldCompanyIndex = null;
    holdController?.stop();
    holdController = null;
  }

  // one purchase attempt; stops the hold once it's no longer affordable so it
  // doesn't just spin uselessly against a purchase that can never succeed.
  // render() runs immediately (not gated behind awaiting the press-bounce
  // animation) so price/affordability update every tick in real time — during a
  // fast hold, each tick's triggerButtonPress cancels the previous tick's still-
  // pending one before its "animationend" ever fires, so awaiting it here stalled
  // render() until the very last tick's animation was finally left undisturbed
  // (i.e. until the hold actually stopped). triggerButtonPress is still fired
  // (fire-and-forget) on the freshly rendered button so it still bounces each
  // tick, same look as boostMenu.ts/upgradeMenu.ts's single-click buttons
  function fireStockRaise(companyIndex: number): void {
    if (!buyStockRaise(companyIndex)) {
      stopHold();
      return;
    }
    playSold();
    render();
    const button = list.querySelector<HTMLButtonElement>(
      `button[data-company-index="${companyIndex}"]`,
    );
    if (button) void triggerButtonPress(button);
  }

  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>(
      "button[data-company-index]",
    );
    if (!button || button.disabled) return;
    const companyIndex = Number(button.dataset.companyIndex);
    stopHold(); // safety net against stale state from an interrupted previous gesture
    heldCompanyIndex = companyIndex;
    fireStockRaise(companyIndex);
    holdController = startPressAndHold(() => {
      if (heldCompanyIndex !== companyIndex) return; // hold already stopped
      fireStockRaise(companyIndex);
    }, STOCK_HOLD_INTERVAL_MS);
  });

  window.addEventListener("pointerup", stopHold);
  window.addEventListener("pointercancel", stopHold);

  // press-and-hold auto-repeat for Invest in the market, same interval/shape
  // as the per-company stock-raise hold above but with its own independent
  // hold state (this button isn't keyed by company index). investReferenceTotal
  // is the combined total income snapshotted ONCE right when a fresh hold
  // starts — economy.ts's getInvestCost spends a flat 10% of THIS frozen
  // value every press (not a freshly re-read total), which is what
  // guarantees exactly 10 presses fully drains a hold regardless of scale
  const INVEST_HOLD_INTERVAL_MS = 100;
  let investHeld = false;
  let investHoldController: PressAndHoldController | null = null;
  let investReferenceTotal: BigNumber = getAllCompaniesTotalIncome();

  // while idle (no hold in progress), "what would the next press cost"
  // should preview against the LIVE current total (about to become the
  // reference the moment a fresh hold actually starts) — only an ACTIVE hold
  // freezes it
  function currentInvestReference(): BigNumber {
    return investHeld ? investReferenceTotal : getAllCompaniesTotalIncome();
  }

  function stopInvestHold(): void {
    investHeld = false;
    investHoldController?.stop();
    investHoldController = null;
  }

  // patches just the specific text nodes an invest press can change (total
  // income, investment-portfolio %, total boost %, each company's own
  // modifier % — investing drains total income, which company value/modifier
  // math depends on) plus every button's disabled state, WITHOUT touching
  // list.innerHTML — a full render() rebuild here (torn down and recreated
  // every ~100ms for as long as the hold lasts) was fighting the browser's
  // own native touch-scroll tracking on mobile, occasionally yanking the list
  // to a random scroll position mid-hold
  function updateInvestDynamicValues(): void {
    const totalIncomeEl = list.querySelector<HTMLElement>(
      ".worker-menu__total-income",
    );
    if (totalIncomeEl) {
      totalIncomeEl.textContent = formatTotalIncomeFull(
        getAllCompaniesTotalIncome(),
      );
    }
    const investmentPortfolioEl = list.querySelector<HTMLElement>(
      "[data-investment-portfolio-value]",
    );
    if (investmentPortfolioEl) {
      investmentPortfolioEl.textContent = formatBoostPercent(
        getInvestmentPortfolioPercent(),
      );
    }
    const totalBoostEl = list.querySelector<HTMLElement>(
      "[data-total-boost-value]",
    );
    if (totalBoostEl) {
      totalBoostEl.textContent = formatBoostPercent(
        getGlobalIncomeBoostPercent(),
      );
    }
    for (const i of getActiveCorporationIndices()) {
      const name = getCorporationName(i);
      const el = list.querySelector<HTMLElement>(
        `[data-modifier-name="${name}"]`,
      );
      if (el) {
        el.textContent = formatBoostPercent(
          getStockContributionPercent(i) + getCompanyBaseModifierPercent(i),
        );
      }
    }
    updateAffordability();
  }

  function fireInvest(): void {
    if (!investInMarket(investReferenceTotal)) {
      stopInvestHold();
      return;
    }
    playSold();
    updateInvestDynamicValues();
    const button = list.querySelector<HTMLButtonElement>(
      "#invest-in-market-item",
    );
    if (button) void triggerButtonPress(button);
  }

  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#invest-in-market-item");
    if (!button || button.disabled) return;
    stopInvestHold(); // safety net against a stale interrupted gesture
    investReferenceTotal = getAllCompaniesTotalIncome();
    investHeld = true;
    fireInvest();
    investHoldController = startPressAndHold(() => {
      if (!investHeld) return; // hold already stopped
      fireInvest();
    }, INVEST_HOLD_INTERVAL_MS);
  });

  window.addEventListener("pointerup", stopInvestHold);
  window.addEventListener("pointercancel", stopInvestHold);

  // single-shot (not press-and-hold, unlike the per-company stock items above) —
  // one press conference at a time makes sense given its own 30-minute-income cost
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#press-conference-item");
    if (!button || button.disabled) return;
    if (!holdPressConference()) return;
    playSold();
    render();
    onPressConferenceHeld?.();
  });

  // re-checks affordability while the menu sits open, same as boostMenu.ts's own
  // updateAffordability, so a grayed-out item turns clickable again as soon as
  // income catches up instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    // same hoist-out-of-the-loop fix as render() above
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const buttons = list.querySelectorAll<HTMLButtonElement>(
      "button[data-company-index]",
    );
    buttons.forEach((button) => {
      const companyIndex = Number(button.dataset.companyIndex);
      button.disabled = lt(
        allCompaniesTotalIncome,
        getStockRaiseCost(companyIndex),
      );
    });
    const pressConferenceButton = list.querySelector<HTMLButtonElement>(
      "#press-conference-item",
    );
    if (pressConferenceButton) {
      pressConferenceButton.disabled =
        getFreePressConferenceCount() === 0 &&
        lt(allCompaniesTotalIncome, getPressConferenceCost());
    }
    const investButton = list.querySelector<HTMLButtonElement>(
      "#invest-in-market-item",
    );
    if (investButton) {
      const cost = getInvestCost(currentInvestReference());
      investButton.disabled = isZero(cost) || lt(allCompaniesTotalIncome, cost);
    }
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
    refreshInterval = setInterval(updateAffordability, 250);
  }

  async function close(): Promise<void> {
    stopHold();
    stopInvestHold();
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  backdrop.addEventListener("click", close);

  return { open, close, refresh: render };
}
