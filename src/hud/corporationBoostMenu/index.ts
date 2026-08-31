import { loadBuildings, type Floor } from "../../gameState";
import {
  formatPrice,
  formatTotalIncomeFull,
  animateDialogClose,
} from "../../utils";
import {
  spendFromAllCompanies,
  getAllCompaniesTotalIncome,
  getStoredTotalIncome,
  getBuildingsCurrentIncomePerSecond,
} from "../../totalIncome";
import { getCorporationCount, getCorporationName } from "../../corporationName";
import { getBuildingPrice } from "../../buildings";
import { companyStorageKey } from "../../company";
import { playSwoosh, playSold } from "../../sound";
import coinIconUrl from "../../assets/coin.png";
import managerIconUrl from "../../assets/managerIcon.png";

// each corporation's own purchased "shares" — starts at 1 and goes up 1 per
// purchase, separate from (and never affecting) its totalIncome/buildings. The
// DISPLAYED/effective stock price (see getStockPrice below) is these shares
// diluted by how much the company has grown since, not this raw count itself
const STOCK_PRICE_KEY = "cash-clicker:stock-price";
const STOCK_PRICE_BASE = 1;
const STOCK_PRICE_STEP = 1;
const SECONDS_PER_HOUR = 3600;

function loadStockShares(companyIndex: number): number {
  try {
    const raw = localStorage.getItem(
      companyStorageKey(STOCK_PRICE_KEY, companyIndex),
    );
    const parsed = raw !== null ? Number(raw) : STOCK_PRICE_BASE;
    return Number.isFinite(parsed) ? parsed : STOCK_PRICE_BASE;
  } catch {
    return STOCK_PRICE_BASE;
  }
}

function saveStockShares(companyIndex: number, value: number): void {
  try {
    localStorage.setItem(
      companyStorageKey(STOCK_PRICE_KEY, companyIndex),
      String(value),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// wipes every corporation's purchased shares; call alongside clearCorporationNames
// on a full game reset, so a fresh game doesn't inherit old stock-price upgrades
export function clearStockPrices(): void {
  const count = getCorporationCount();
  for (let i = 0; i < count; i++) {
    try {
      localStorage.removeItem(companyStorageKey(STOCK_PRICE_KEY, i));
    } catch {
      // storage unavailable: nothing to clear
    }
  }
  clearMarketInfluence();
}

// the stock price actually shown/used everywhere (menu display, boost formula):
// raw purchased shares diluted by log10 of the company's own current value, so
// buying cheap while a company is small doesn't just compound into a permanently
// bigger price/boost forever as that same company grows huge afterward — it
// balances back out, the same way real share dilution works. log10 (not the raw
// value) so this stays a gentle, gradual drop rather than crushing the price to
// nothing the instant a company's value gets big — floored at $1 so dilution
// alone can never push it below its own starting price
export function getStockPrice(companyIndex: number): number {
  const shares = loadStockShares(companyIndex);
  const companyValue = Math.max(10, getCompanyValue(companyIndex));
  return Math.max(STOCK_PRICE_BASE, shares / Math.log10(companyValue));
}

// how many times a company's stock has actually been raised — the menu shows
// this ("x3") instead of the dollar stock price itself, same "xN" convention as
// the crit-upgrade label (floors/upgradeButton)
export function getStockTimesBought(companyIndex: number): number {
  return loadStockShares(companyIndex) - STOCK_PRICE_BASE;
}

// $ cost to raise a company's stock price once: its own total income over a full
// hour at its current rate, doubled for every time it's already been bought (so
// the very first raise costs 1x that hourly income, the next 2x, then 4x, ...)
export function getStockRaiseCost(companyIndex: number): number {
  const timesBought = loadStockShares(companyIndex) - STOCK_PRICE_BASE;
  const baseCost =
    getBuildingsCurrentIncomePerSecond(
      loadBuildings(companyIndex),
      Date.now(),
    ) * SECONDS_PER_HOUR;
  return baseCost * 2 ** timesBought;
}

// raises companyIndex's purchased shares by STOCK_PRICE_STEP if affordable —
// spent proportionally from every corporation's own combined funds (see
// totalIncome.ts's spendFromAllCompanies), not just the currently active one.
// Returns whether it succeeded
export function buyStockRaise(companyIndex: number): boolean {
  if (!spendFromAllCompanies(getStockRaiseCost(companyIndex))) return false;
  saveStockShares(
    companyIndex,
    loadStockShares(companyIndex) + STOCK_PRICE_STEP,
  );
  return true;
}

// $/sec every unlocked floor of every company is currently earning combined —
// same per-company rate getStockRaiseCost uses, just summed across every
// corporation instead of just one
function getAllCompaniesCurrentIncomePerSecond(now: number): number {
  const count = getCorporationCount();
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += getBuildingsCurrentIncomePerSecond(loadBuildings(i), now);
  }
  return total;
}

const PRESS_CONFERENCE_INCOME_SECONDS = 30 * 60;

// $ cost of the single, not-per-company "Hold press conference" action: every
// company's combined income over 30 minutes at its current rate, flat (unlike
// getStockRaiseCost, this never doubles with repeated purchases)
export function getPressConferenceCost(): number {
  return (
    getAllCompaniesCurrentIncomePerSecond(Date.now()) *
    PRESS_CONFERENCE_INCOME_SECONDS
  );
}

// raises EVERY company's purchased shares by STOCK_PRICE_STEP at once, for one
// combined cost (see getPressConferenceCost) instead of paying each company's
// own escalating getStockRaiseCost individually — the actual boost comes from
// then playing hud/pressConferenceGame's own mini-game (see Market Influence
// below), this just pays the entry fee. Returns whether it succeeded
export function holdPressConference(): boolean {
  return spendFromAllCompanies(getPressConferenceCost());
}

// "Market Influence %" — earned by playing hud/pressConferenceGame's own
// mini-game, banked once per round via addMarketInfluencePercent; not tied to
// any one company either. Contributes directly, 1:1, to the global boost (see
// getGlobalIncomeBoostPercent) — no leverage/scaling/cap of any kind
const MARKET_INFLUENCE_KEY = "cash-clicker:market-influence-percent";

export function getMarketInfluencePercent(): number {
  try {
    const raw = localStorage.getItem(MARKET_INFLUENCE_KEY);
    const parsed = raw !== null ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// banks additional influence earned just now (delta can be negative, but the
// running total is floored at 0)
export function addMarketInfluencePercent(delta: number): void {
  try {
    localStorage.setItem(
      MARKET_INFLUENCE_KEY,
      String(Math.max(0, getMarketInfluencePercent() + delta)),
    );
  } catch {
    // storage unavailable: nothing to persist
  }
}

// folded into clearStockPrices above so a full game reset doesn't inherit an
// old market-influence modifier either
function clearMarketInfluence(): void {
  try {
    localStorage.removeItem(MARKET_INFLUENCE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

// $ "invested" in a company's buildings — sum of what each one (after the
// always-free first) cost to unlock, same buildings.ts pricing used everywhere
// else on the map
function getBuildingsValue(buildingCount: number): number {
  let total = 0;
  for (let i = 1; i < buildingCount; i++) total += getBuildingPrice(i);
  return total;
}

// $ "invested" in every floor's upgrades across a company's buildings — each
// upgrade already bought raised that floor's rate by its own rateStep, so this is
// the total $/sec worth of upgrade purchases actually paid for
function getUpgradesValue(buildings: Floor[][]): number {
  let total = 0;
  for (const floors of buildings) {
    for (const floor of floors) {
      total += floor.upgradeCount * floor.rateStep;
    }
  }
  return total;
}

// a company's overall value — buildings owned + upgrades bought + its own
// current income (wealth) — the base a stock-price contribution below is
// weighted against
function getCompanyValue(companyIndex: number): number {
  const buildings = loadBuildings(companyIndex);
  return (
    getBuildingsValue(buildings.length) +
    getUpgradesValue(buildings) +
    getStoredTotalIncome(companyIndex, buildings)
  );
}

// how much a company's stock price contributes to the combined income boost.
// stockPrice is already dilution-tempered (see getStockPrice above), so it's
// used directly here — logging it AGAIN on top of that flattened purchases out
// to almost nothing (buying many more shares barely moved the modifier). Only
// companyValue still needs its own log10: it alone can reach illion-scale late
// game, so "10 orders of magnitude bigger" becomes "10 points bigger" instead of
// blowing the percentage up to something needing scientific notation
const STOCK_CONTRIBUTION_RATE = 0.1;

function getStockContributionPercent(companyIndex: number): number {
  const stockPrice = getStockPrice(companyIndex);
  const companyValue = Math.max(10, getCompanyValue(companyIndex));
  return stockPrice * Math.log10(companyValue) * STOCK_CONTRIBUTION_RATE;
}

// summed across every corporation plus the market-influence modifier — the
// actual global income boost applied to every floor of every building of every
// company (see totalIncome.ts's startTotalIncomeTicker/gameState.ts's
// computeIdleIncome, both take this as an injected multiplier to avoid a
// circular import back into this hud module). Market Influence contributes its
// own raw banked % directly, 1:1 — no leverage/scaling against anything else,
// so whatever a mini-game round banked is exactly what shows up here
export function getGlobalIncomeBoostPercent(): number {
  const count = getCorporationCount();
  let total = getMarketInfluencePercent();
  for (let i = 0; i < count; i++) total += getStockContributionPercent(i);
  return total;
}

export function getGlobalIncomeBoostMultiplier(): number {
  return 1 + getGlobalIncomeBoostPercent() / 100;
}

// +N.NN% — the leading + marks it as always an increase, never a penalty; plain
// fixed-point since getStockContributionPercent now keeps this comfortably small
function formatBoostPercent(percent: number): string {
  return `+${percent.toFixed(2)}%`;
}

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
    const count = getCorporationCount();
    const modifierRows = Array.from({ length: count }, (_, i) => {
      const pct = getStockContributionPercent(i);
      return `
        <div class="worker-menu__modifier-row">
          <span>${getCorporationName(i)}</span>
          <span>${formatBoostPercent(pct)}</span>
        </div>
      `;
    }).join("");
    const marketInfluencePct = getMarketInfluencePercent();
    const marketInfluenceRow = `
      <div class="worker-menu__modifier-row">
        <span>Market influence</span>
        <span>${formatBoostPercent(marketInfluencePct)}</span>
      </div>
    `;
    const totalPct = getGlobalIncomeBoostPercent();
    const pressConferenceCost = getPressConferenceCost();
    // computed once and reused below — getAllCompaniesTotalIncome() is itself
    // O(companies) (a localStorage read + JSON.parse per company), so calling
    // it again inside the per-company items loop made render() scale
    // O(companies^2)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const pressConferenceAffordable =
      allCompaniesTotalIncome >= pressConferenceCost;
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
      <h3 class="worker-menu__subheader">Stock price income modifiers</h3>
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
        <span class="worker-menu__price">${formatPrice(pressConferenceCost)}</span>
      </button>
      <h3 class="worker-menu__subheader">Raise Stock price</h3>
      ${items}
    `;
  }

  // press-and-hold auto-repeat (same interval/speed-up timing as gameCanvas.ts's
  // upgrade button): pointerdown buys once immediately and starts repeating;
  // pointerup/leave/cancel anywhere stops it. Tracks by company INDEX, not the
  // button element itself, since every render() call replaces every button node
  const STOCK_HOLD_INTERVAL_MS = 100;
  const STOCK_HOLD_FAST_AFTER_MS = 5000;
  const STOCK_HOLD_FAST_MULTIPLIER = 5;
  let heldCompanyIndex: number | null = null;
  let holdStartTime = 0;
  let holdTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function stopHold(): void {
    heldCompanyIndex = null;
    if (holdTimeoutId !== null) {
      clearTimeout(holdTimeoutId);
      holdTimeoutId = null;
    }
  }

  // one purchase attempt; stops the hold once it's no longer affordable so it
  // doesn't just spin uselessly against a purchase that can never succeed.
  // Renders immediately (not gated behind awaiting the button's own press-bounce
  // animation) — during a fast hold, back-to-back calls kept re-triggering that
  // same animation on the same button before the previous one's "animationend"
  // ever fired, so the awaited render() after it never actually ran, and the
  // displayed cost/price/percentages all looked frozen for as long as the hold
  // continued
  function fireStockRaise(companyIndex: number): void {
    if (!buyStockRaise(companyIndex)) {
      stopHold();
      return;
    }
    playSold();
    render();
  }

  // self-rescheduling (not setInterval) so the delay can change mid-hold once the
  // press crosses STOCK_HOLD_FAST_AFTER_MS
  function scheduleHoldRepeat(companyIndex: number): void {
    const heldMs = performance.now() - holdStartTime;
    const delay =
      heldMs >= STOCK_HOLD_FAST_AFTER_MS
        ? STOCK_HOLD_INTERVAL_MS / STOCK_HOLD_FAST_MULTIPLIER
        : STOCK_HOLD_INTERVAL_MS;
    holdTimeoutId = setTimeout(() => {
      if (heldCompanyIndex !== companyIndex) return; // hold already stopped
      fireStockRaise(companyIndex);
      scheduleHoldRepeat(companyIndex);
    }, delay);
  }

  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>(
      "button[data-company-index]",
    );
    if (!button || button.disabled) return;
    const companyIndex = Number(button.dataset.companyIndex);
    heldCompanyIndex = companyIndex;
    holdStartTime = performance.now();
    fireStockRaise(companyIndex);
    scheduleHoldRepeat(companyIndex);
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
