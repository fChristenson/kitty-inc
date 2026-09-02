import {
  formatPrice,
  formatTotalIncomeFull,
  animateDialogClose,
  triggerButtonPress,
} from "../../utils";
import { getAllCompaniesTotalIncome } from "../../totalIncome";
import { getCorporationCount, getCorporationName } from "../../corporationName";
import {
  startPressAndHold,
  type PressAndHoldController,
} from "../../shared/pressAndHold";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { getManagerIconUrl } from "../../floors";

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
  getMarketInfluencePercent,
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
  getMarketInfluencePercent,
  addMarketInfluencePercent,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
} from "./economy";

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
    const count = getCorporationCount();
    const modifierRows = Array.from({ length: count }, (_, i) => ({
      name: getCorporationName(i),
      pct: getStockContributionPercent(i) + getCompanyBaseModifierPercent(i),
    }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        ({ name, pct }) => `
        <div class="worker-menu__modifier-row">
          <span>${name}</span>
          <span>${formatBoostPercent(pct)}</span>
        </div>
      `,
      )
      .join("");
    const marketInfluencePct = getMarketInfluencePercent();
    const marketInfluenceRow = `
      <div class="worker-menu__modifier-row worker-menu__modifier-row--divider">
        <span>Market influence</span>
        <span>${formatBoostPercent(marketInfluencePct)}</span>
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
      allCompaniesTotalIncome >= pressConferenceCost;
    const pressConferencePriceLabel =
      freePressConferenceCount > 0
        ? `FREE (x${freePressConferenceCount})`
        : formatPrice(pressConferenceCost);
    const items = Array.from({ length: count }, (_, i) => {
      const cost = getStockRaiseCost(i);
      const affordable = allCompaniesTotalIncome >= cost;
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
    }).join("");
    list.innerHTML = `
      <h3 class="worker-menu__subheader">Corporation assets</h3>
      <span class="worker-menu__total-income">${formatTotalIncomeFull(allCompaniesTotalIncome)}</span>
      <h3 class="worker-menu__subheader">Income modifiers</h3>
      ${marketInfluenceRow}
      ${modifierRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span>${formatBoostPercent(totalPct)}</span>
      </div>
      <h3 class="worker-menu__subheader">Raise Market Influence</h3>
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
      button.disabled =
        allCompaniesTotalIncome < getStockRaiseCost(companyIndex);
    });
    const pressConferenceButton = list.querySelector<HTMLButtonElement>(
      "#press-conference-item",
    );
    if (pressConferenceButton) {
      pressConferenceButton.disabled =
        getFreePressConferenceCount() === 0 &&
        allCompaniesTotalIncome < getPressConferenceCost();
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
