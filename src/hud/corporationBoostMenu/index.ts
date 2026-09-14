import { animateDialogClose } from "../../utils";
import { playSwoosh } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { arrowIconMarkup } from "../../shared/arrowIcon";
import {
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  getCritProcCount,
} from "../../shared/critTypes";
import type { CritProcKind } from "../../shared/critTypes";
import { createGhostClickGuard } from "../../shared/ghostClickGuard";
import { onTapOrClick } from "../../shared/tapEvents";

export {
  getCompanyBaseModifierPercent,
  getCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
  formatBoostPercent,
  mergeCompanies,
} from "./economy";
export type { MergeCompaniesResult } from "./economy";

// every "special crit" piggyback proc (see .github/instructions/special-crits.
// instructions.md), for the info list below — derived straight from
// shared/critTypes's own canonical CRIT_PROC_INFO table (icon/label match each
// proc's own celebration flash exactly, screenShake.ts/critCelebration.ts)
// instead of this menu hand-duplicating every label/icon/description a
// second time. Sorted alphabetically by label — CRIT_PROC_KINDS' own order is
// roll-rarity-driven, not a sensible reading order for a lookup list
const CRIT_INFO: {
  kind: CritProcKind;
  icon: string;
  label: string;
  description: string;
}[] = CRIT_PROC_KINDS.map((kind) => {
  const info = CRIT_PROC_INFO[kind];
  return {
    kind,
    icon: getImageUrl(info.icon),
    label: info.label,
    description: info.description,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

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

  // icon/label/description are static, but each row's own landed-count badge
  // is live game state — re-read via getCritProcCount() on every render()/
  // refresh() call instead of baking it into the static CRIT_INFO array
  function render(): void {
    list.innerHTML = CRIT_INFO.map(({ kind, icon, label, description }) => {
      const count = getCritProcCount(kind);
      const badge =
        count > 0
          ? `<span class="crit-info-item__count-badge">${count}</span>`
          : "";
      return `
        <details class="crit-info-item">
          <summary class="crit-info-item__summary">
            <span class="crit-info-item__label">
              <span class="crit-info-item__icon-wrap">
                <img src="${icon}" class="worker-menu__icon" alt="" />
                ${badge}
              </span>
              <span class="crit-info-item__name">${label}</span>
            </span>
            <span class="crit-info-item__chevron" aria-hidden="true">${CHEVRON_SVG}</span>
          </summary>
          <p class="crit-info-item__description">${description}</p>
        </details>
      `;
    }).join("");
  }

  // opened by a tap on the action bar's own Boost button — same trailing-
  // click-hits-the-new-backdrop risk any button-opened dialog has
  const ghostClickGuard = createGhostClickGuard();

  function open(): void {
    render();
    menu.hidden = false;
    ghostClickGuard.markOpened();
    playSwoosh();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
  }

  onTapOrClick(backdrop, () => {
    if (ghostClickGuard.shouldIgnore()) return;
    close();
  });

  function refresh(): void {
    render();
  }

  return { open, close, refresh };
}
