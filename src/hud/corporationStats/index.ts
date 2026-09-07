import { formatPrice, animateDialogClose } from "../../utils";
import {
  getAllCompaniesTotalIncome,
  getStoredTotalIncome,
  getAllCompaniesIncomeRatePerSecond,
  getCompanyIncomeRatePerSecond,
} from "../../totalIncome";
import { getCorporationName } from "../../corporationName";
import { getActiveCorporationIndices } from "../../company";
import { playSwoosh } from "../../sound";
import {
  getStockContributionPercent,
  getCompanyBaseModifierPercent,
  getMarketInfluencePercent,
  getInvestmentPortfolioPercent,
  getSecuredAssetsPercent,
  getTaxRebatePercent,
  getAssetsMovedPercent,
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
          <span>${formatPrice(getStoredTotalIncome(index))}</span>
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
          <span>${formatPrice(getCompanyIncomeRatePerSecond(index))}/s</span>
        </div>
      `,
      )
      .join("");
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
        <span>${formatPrice(getAllCompaniesTotalIncome())}</span>
      </div>
      <h3 class="worker-menu__subheader">Corporation income rate</h3>
      ${companyIncomeRows}
      <div class="worker-menu__modifier-row worker-menu__modifier-row--total">
        <span>Total</span>
        <span>${formatPrice(getAllCompaniesIncomeRatePerSecond())}/s</span>
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
      <div class="worker-menu__modifier-row">
        <span>Tax rebate</span>
        <span>${formatBoostPercent(getTaxRebatePercent())}</span>
      </div>
      <div class="worker-menu__modifier-row">
        <span>Assets in haven</span>
        <span>${formatBoostPercent(getAssetsMovedPercent())}</span>
      </div>
      <div class="worker-menu__modifier-row worker-menu__modifier-row--divider">
        <span>Investment portfolio</span>
        <span>${formatBoostPercent(getInvestmentPortfolioPercent())}</span>
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
    playSwoosh();
    startPolling();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    stopPolling();
  }

  backdrop.addEventListener("click", close);

  return { open, close };
}
