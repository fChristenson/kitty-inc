import { formatPrice, animateDialogClose } from "../../utils";
import {
  getAllCompaniesTotalIncome,
  getStoredTotalIncome,
  getAllCompaniesIncomeRatePerSecond,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import type { BigNumber } from "../../shared/bigNumber";
import { getCorporationName } from "../../corporationName";
import { getActiveCorporationIndices } from "../../company";
import { playSwoosh } from "../../sound";
import {
  getCompanyBaseModifierPercent,
  getMarketInfluencePercent,
  getSecuredAssetsPercent,
  getTaxRebatePercent,
  getGlobalIncomeBoostPercent,
  formatBoostPercent,
} from "../corporationBoostMenu";

// read-only "Corporation income rate"/"Income modifiers" breakdown — split
// out of corporationBoostMenu so that dialog only has to hold its own
// buy/spend buttons. Opened by tapping corporationBoostMenu's own "Total
// income" summary row, on top of it (same layering as the 4 minigames)
export function createCorporationStatsMarkup(): string {
  return `
    <div class="worker-menu" id="corporation-stats-menu" hidden>
      <div class="worker-menu__backdrop" id="corporation-stats-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Corporation Statistics</h2>
        </div>
        <div class="worker-menu__list" id="corporation-stats-menu-list"></div>
      </div>
    </div>
  `;
}

export interface CorporationStats {
  open: () => void;
  close: () => void;
}

export function wireCorporationStats(container: HTMLElement): CorporationStats {
  const menu = container.querySelector<HTMLDivElement>(
    "#corporation-stats-menu",
  )!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#corporation-stats-menu-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const list = container.querySelector<HTMLDivElement>(
    "#corporation-stats-menu-list",
  )!;

  // debug toggle: tapping any Total row switches every $ value in this
  // dialog between the normal K/M/B-style suffix and a raw 2-decimal
  // scientific notation, so the actual precision behind a rounded suffix is
  // inspectable
  let scientificMode = false;

  function formatMoney(value: BigNumber): string {
    if (!scientificMode) return formatPrice(value);
    const sign = value.mantissa < 0 ? "-" : "";
    const mantissa = Math.abs(value.mantissa).toFixed(2);
    const exponentSign = value.exponent >= 0 ? "+" : "";
    return `$${sign}${mantissa}e${exponentSign}${value.exponent}`;
  }

  function render(): void {
    const scrollTop = list.scrollTop;
    const activeIndices = getActiveCorporationIndices();
    const companyAssetRows = activeIndices
      .map((i) => ({ index: i, name: getCorporationName(i) }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        ({ index, name }) => `
        <div class="worker-menu__modifier-row">
          <span>${name}</span>
          <span>${formatMoney(getStoredTotalIncome(index))}</span>
        </div>
      `,
      )
      .join("");
    const companyIncomeRows = activeIndices
      .map((i) => ({ index: i, name: getCorporationName(i) }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        ({ index, name }) => `
        <div class="worker-menu__modifier-row">
          <span>${name}</span>
          <span>${formatMoney(getCompanyIncomeRatePerSecond(index))}/s</span>
        </div>
      `,
      )
      .join("");
    const modifierRows = activeIndices
      .map((i) => ({
        name: getCorporationName(i),
        pct: getCompanyBaseModifierPercent(i),
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
    list.innerHTML = `
      <h3 class="worker-menu__subheader">Corporation assets</h3>
      ${companyAssetRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span>${formatMoney(getAllCompaniesTotalIncome())}</span>
      </div>
      <h3 class="worker-menu__subheader">Corporation income rate</h3>
      ${companyIncomeRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span>${formatMoney(getAllCompaniesIncomeRatePerSecond())}/s</span>
      </div>
      <h3 class="worker-menu__subheader">Income modifiers</h3>
      <div class="worker-menu__modifier-row">
        <span>Market influence</span>
        <span>${formatBoostPercent(getMarketInfluencePercent())}</span>
      </div>
      <div class="worker-menu__modifier-row">
        <span>Secured assets</span>
        <span>${formatBoostPercent(getSecuredAssetsPercent())}</span>
      </div>
      <div class="worker-menu__modifier-row worker-menu__modifier-row--divider">
        <span>Tax rebate</span>
        <span>${formatBoostPercent(getTaxRebatePercent())}</span>
      </div>
      ${modifierRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span>${formatBoostPercent(getGlobalIncomeBoostPercent())}</span>
      </div>
    `;
    list.scrollTop = scrollTop;
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // any Total row toggles scientificMode for every $ value in this dialog —
  // pointerdown (not click) since this dialog's own 250ms poll keeps replacing
  // list.innerHTML; a click landing right as that swap happens can land on an
  // element the browser no longer considers "pressed", silently eating the
  // toggle. pointerdown fires immediately on contact, before any such swap
  // has a chance to invalidate it
  list.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".worker-menu__modifier-row--total")) return;
    scientificMode = !scientificMode;
    render();
  });

  // no buttons/holds to fight here (unlike corporationBoostMenu) — a full
  // render() every tick is simple and cheap enough for a read-only view
  function startPolling(): void {
    if (refreshInterval === null && !menu.hidden) {
      refreshInterval = setInterval(render, 250);
    }
  }

  function stopPolling(): void {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function open(): void {
    render();
    menu.hidden = false;
    openedAt = Date.now();
    playSwoosh();
    startPolling();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    stopPolling();
  }

  // opened by a tap directly on the canvas HUD/map readout, right where the
  // backdrop then appears — mobile browsers can synthesize a trailing
  // compatibility "click" for that same touch shortly after, landing on the
  // now-visible backdrop and instantly closing what was just opened (same
  // ghost-click fix as floorUpgradeMenu, also opened from a canvas tap)
  const IGNORE_BACKDROP_CLICK_MS = 300;
  let openedAt = 0;

  backdrop.addEventListener("click", () => {
    if (Date.now() - openedAt < IGNORE_BACKDROP_CLICK_MS) return;
    close();
  });

  return { open, close };
}
