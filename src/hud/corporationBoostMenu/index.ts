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

// the map view's own prev/next/pointer arrow icon (shared/arrowIcon), rotated
// to point left via CSS for the detail pane's own back button
const BACK_ARROW_SVG = arrowIconMarkup(22);

// reuses .worker-menu's styling — a dialog showing every special crit as a
// 3-column grid of icons; tapping one slides the grid out to the left and a
// full detail card (big icon + name + description) in from the right, with a
// back arrow in the header to slide back (see render()/showDetail() below)
export function createCorporationBoostMenuMarkup(): string {
  return `
    <div class="worker-menu" id="corporation-boost-menu" hidden>
      <div class="worker-menu__backdrop" id="corporation-boost-menu-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <button
            type="button"
            class="crit-info-back"
            id="corporation-boost-menu-back"
            aria-label="Back to all crits"
            hidden
          >${BACK_ARROW_SVG}</button>
          <h2>Special Crits</h2>
        </div>
        <div class="crit-info-slider" id="corporation-boost-menu-slider">
          <div class="crit-info-slider__track">
            <div class="crit-info-slider__pane">
              <div class="crit-info-grid" id="corporation-boost-menu-grid"></div>
            </div>
            <div class="crit-info-slider__pane">
              <div class="crit-info-detail" id="corporation-boost-menu-detail"></div>
            </div>
          </div>
        </div>
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
  const slider = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu-slider",
  )!;
  const grid = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu-grid",
  )!;
  const detail = container.querySelector<HTMLDivElement>(
    "#corporation-boost-menu-detail",
  )!;
  const backButton = container.querySelector<HTMLButtonElement>(
    "#corporation-boost-menu-back",
  )!;

  // which crit the detail pane is currently showing, so refresh() can re-render
  // its live landed count without kicking the player back to the grid
  let openKind: CritProcKind | null = null;

  function renderGrid(): void {
    grid.innerHTML = CRIT_INFO.map(({ kind, icon, label }) => {
      const count = getCritProcCount(kind);
      const badge =
        count > 0
          ? `<span class="crit-info-tile__count-badge">${count}</span>`
          : "";
      return `
        <button type="button" class="crit-info-tile" data-kind="${kind}" aria-label="${label}">
          <img src="${icon}" class="crit-info-tile__icon" alt="" />
          ${badge}
        </button>
      `;
    }).join("");
  }

  function renderDetail(): void {
    const info = CRIT_INFO.find(({ kind }) => kind === openKind);
    if (!info) return;
    const count = getCritProcCount(info.kind);
    const landed =
      count > 0
        ? `<p class="crit-info-detail__count">Landed ${count}&times;</p>`
        : `<p class="crit-info-detail__count crit-info-detail__count--none">Not yet discovered</p>`;
    detail.innerHTML = `
      <img src="${info.icon}" class="crit-info-detail__icon" alt="" />
      <h3 class="crit-info-detail__name">${info.label}</h3>
      <p class="crit-info-detail__description">${info.description}</p>
      ${landed}
    `;
  }

  function showDetail(kind: CritProcKind): void {
    openKind = kind;
    renderDetail();
    detail.parentElement?.scrollTo({ top: 0 });
    slider.classList.add("crit-info-slider--detail");
    backButton.hidden = false;
    playSwoosh();
  }

  function showGrid(): void {
    openKind = null;
    slider.classList.remove("crit-info-slider--detail");
    backButton.hidden = true;
    playSwoosh();
  }

  // one delegated handler instead of one per tile, so renderGrid() can replace
  // the whole grid on every refresh without rewiring anything
  onTapOrClick(grid, (event) => {
    const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      ".crit-info-tile",
    );
    const kind = tile?.dataset.kind as CritProcKind | undefined;
    if (kind) showDetail(kind);
  });

  onTapOrClick(backButton, () => showGrid());

  // opened by a tap on the action bar's own Boost button — same trailing-
  // click-hits-the-new-backdrop risk any button-opened dialog has
  const ghostClickGuard = createGhostClickGuard();

  function open(): void {
    showGrid();
    renderGrid();
    grid.parentElement?.scrollTo({ top: 0 });
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

  // icon/label/description are static, but each crit's own landed-count badge
  // is live game state — re-read via getCritProcCount() on every render
  function refresh(): void {
    renderGrid();
    if (openKind) renderDetail();
  }

  return { open, close, refresh };
}
