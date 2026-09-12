import { animateDialogClose } from "../../utils";
import { playSwoosh } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { arrowIconMarkup } from "../../shared/arrowIcon";

export {
  getMinigameEntryCost,
  getFreePressConferenceCount,
  grantFreePressConference,
  holdPressConference,
  getCompanyBaseModifierPercent,
  getMarketInfluencePercent,
  addMarketInfluencePercent,
  getSecuredAssetsPercent,
  addSecuredAssetsPercent,
  getTaxRebatePercent,
  addTaxRebatePercent,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
  formatBoostPercent,
  mergeCompanies,
} from "./economy";
export type { MergeCompaniesResult } from "./economy";

// every "special crit" piggyback proc (see .github/instructions/special-crits.
// instructions.md), for the info list below — icon/label match each proc's own
// celebration flash exactly (screenShake.ts/critCelebration.ts), description
// is display-only prose, not read by any game logic
const CRIT_INFO: { icon: string; label: string; description: string }[] = [
  {
    icon: getImageUrl("chain"),
    label: "Chain",
    description: "Repeats the crit on the floor above",
  },
  {
    icon: getImageUrl("mouse"),
    label: "Boost",
    description: "Boosts every worker for free",
  },
  {
    icon: getImageUrl("ball"),
    label: "Bounce",
    description: "Repeats the crit on the floor below",
  },
  {
    icon: getImageUrl("explosion"),
    label: "Boom",
    description: "Repeats the crit up and down at once",
  },
  {
    icon: getImageUrl("booty"),
    label: "Booty",
    description: "Doubles your total income",
  },
  {
    icon: getImageUrl("upgrade"),
    label: "Upgrade",
    description: "Upgrades the floor's crit tier",
  },
  {
    icon: getImageUrl("peppermint"),
    label: "Peppermint",
    description: "Upgrades every other floor's tier",
  },
  {
    icon: getImageUrl("heaven"),
    label: "Heavenly",
    description: "Unlocks, maxes, and upgrades every floor",
  },
];

// the map view's own prev/next/pointer arrow icon (shared/arrowIcon), reused
// here as the expand/collapse chevron — rotated via CSS (.crit-info-item[open])
// the same way cityMap rotates it per direction
const CHEVRON_SVG = arrowIconMarkup(20);

// reuses .worker-menu's styling — a dialog listing every special crit's icon/
// name, expandable (native <details>/<summary>, no JS needed) to reveal its
// own description (see render() below)
export function createCorporationBoostMenuMarkup(): string {
  return `
    <div class="worker-menu" id="corporation-boost-menu" hidden>
      <div class="worker-menu__backdrop" id="corporation-boost-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <h2>Special Crits</h2>
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

  // static content (nothing here depends on game state), so this only ever
  // needs to run once — still exposed as render()/refresh() to match every
  // other worker-menu-style dialog's own open()/refresh() shape
  function render(): void {
    list.innerHTML = CRIT_INFO.map(
      ({ icon, label, description }) => `
        <details class="crit-info-item">
          <summary class="crit-info-item__summary">
            <span class="crit-info-item__label">
              <img src="${icon}" class="worker-menu__icon" alt="" />
              <span class="crit-info-item__name">${label}</span>
            </span>
            <span class="crit-info-item__chevron" aria-hidden="true">${CHEVRON_SVG}</span>
          </summary>
          <p class="crit-info-item__description">${description}</p>
        </details>
      `,
    ).join("");
  }

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
  }

  backdrop.addEventListener("click", close);

  function refresh(): void {
    render();
  }

  return { open, close, refresh };
}
