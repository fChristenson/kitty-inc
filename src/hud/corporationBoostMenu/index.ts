import { animateDialogClose, cancelDialogClose } from "../../utils";
import { playSwoosh } from "../../sound";
import { getStickerUrl, getSilhouetteUrl } from "../../loadAssets";
import { arrowIconMarkup } from "../../shared/arrowIcon";
import {
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  getCritProcCount,
  getCritProcIncomeModifierPercent,
  getCritProcNextMilestoneCount,
} from "../../shared/critTypes";
import type { CritProcKind } from "../../shared/critTypes";
import { createGhostClickGuard } from "../../shared/ghostClickGuard";
import { onTapOrClick } from "../../shared/tapEvents";
import { formatBoostPercent } from "./economy";

export {
  getCompanyBaseModifierPercent,
  getCompanyAssetValue,
  getActiveCompanyAssetValue,
  getCompanyUpgradesValue,
  getGlobalIncomeBoostPercent,
  getGlobalIncomeBoostMultiplier,
  formatBoostPercent,
  mergeCompanies,
} from "./economy";
export type { MergeCompaniesResult } from "./economy";

// every collectible crit badge (see .github/instructions/special-crits.
// instructions.md), for the info list below — derived straight from
// shared/critTypes's own canonical CRIT_PROC_INFO table (icon/label match each
// proc's own celebration flash exactly, screenShake.ts/critCelebration.ts)
// instead of this menu hand-duplicating every label/icon/description a
// second time. Sorted alphabetically by label — CRIT_PROC_KINDS' own order is
// roll-rarity-driven, not a sensible reading order for a lookup list
const BADGE_INFO: {
  kind: CritProcKind;
  icon: string;
  silhouette: string;
  label: string;
  description: string;
}[] = CRIT_PROC_KINDS.map((kind) => {
  const info = CRIT_PROC_INFO[kind];
  return {
    kind,
    icon: getStickerUrl(info.icon),
    silhouette: getSilhouetteUrl(info.icon),
    label: info.label,
    description: info.description,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

const BADGE_INFO_BY_KIND = new Map(BADGE_INFO.map((info) => [info.kind, info]));

// the map view's own prev/next/pointer arrow icon (shared/arrowIcon), rotated
// to point left via CSS for the detail pane's own back button
const BACK_ARROW_SVG = arrowIconMarkup(22);

// reuses .worker-menu's styling — a dialog showing every crit badge as a
// 3-column grid of icons; tapping one slides the grid out to the left and a
// full detail card (big icon + name + description) in from the right, with a
// back arrow in the header to slide back (see render()/showDetail() below)
export function createBadgeCollectionMarkup(): string {
  return `
    <div class="worker-menu" id="badge-collection" hidden>
      <div class="worker-menu__backdrop" id="badge-collection-backdrop"></div>
      <div class="worker-menu__panel">
        <div class="worker-menu__header">
          <button
            type="button"
            class="crit-info-back"
            id="badge-collection-back"
            aria-label="Back to all crits"
            hidden
          >${BACK_ARROW_SVG}</button>
          <h2>Badge Collection</h2>
        </div>
        <div class="crit-info-slider" id="badge-collection-slider">
          <div class="crit-info-slider__track">
            <div class="crit-info-slider__pane">
              <div class="crit-info-grid" id="badge-collection-grid"></div>
            </div>
            <div class="crit-info-slider__pane">
              <div class="crit-info-detail" id="badge-collection-detail"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export interface BadgeCollection {
  open: () => void;
  close: () => void;
  refresh: () => void;
}

export function wireBadgeCollection(container: HTMLElement): BadgeCollection {
  const menu = container.querySelector<HTMLDivElement>("#badge-collection")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#badge-collection-backdrop",
  )!;
  const panel = menu.querySelector<HTMLDivElement>(".worker-menu__panel")!;
  const slider = container.querySelector<HTMLDivElement>(
    "#badge-collection-slider",
  )!;
  const grid = container.querySelector<HTMLDivElement>(
    "#badge-collection-grid",
  )!;
  const detail = container.querySelector<HTMLDivElement>(
    "#badge-collection-detail",
  )!;
  const backButton = container.querySelector<HTMLButtonElement>(
    "#badge-collection-back",
  )!;

  // which crit the detail pane is currently showing, so refresh() can re-render
  // its live landed count without kicking the player back to the grid
  let openKind: CritProcKind | null = null;
  // the grid is built once and then only patched — with a few hundred crits,
  // re-running innerHTML on every refresh() both stutters and throws away every
  // already-decoded icon
  const tiles = new Map<CritProcKind, HTMLElement>();
  let renderedCount = 0;
  let iconObserver: IntersectionObserver | null = null;
  let pageObserver: IntersectionObserver | null = null;
  const sentinel = document.createElement("div");
  sentinel.className = "crit-info-grid__sentinel";
  sentinel.setAttribute("aria-hidden", "true");

  // a crit the player has never landed shows as a black silhouette with no way
  // into its detail card — the artwork is the reward for discovering it, and
  // pointing the tile at the silhouette file keeps that artwork from being
  // downloaded at all until then
  function applyDiscovery(
    tile: HTMLElement,
    kind: CritProcKind,
    count: number,
  ): void {
    const info = BADGE_INFO_BY_KIND.get(kind)!;
    const discovered = count > 0;
    tile.classList.toggle("crit-info-tile--undiscovered", !discovered);
    (tile as HTMLButtonElement).disabled = !discovered;
    tile.setAttribute(
      "aria-label",
      discovered ? info.label : "Undiscovered crit",
    );

    const image = tile.querySelector<HTMLImageElement>(
      ".crit-info-tile__icon",
    )!;
    const wanted = discovered ? info.icon : info.silhouette;
    if (image.dataset.src !== wanted) {
      image.dataset.src = wanted;
      // only swap the live src once the lazy-load observer has actually
      // reached this tile, or it would fetch off-screen icons early
      if (image.hasAttribute("src")) image.src = wanted;
    }

    const existing = tile.querySelector<HTMLElement>(
      ".crit-info-tile__count-badge",
    );
    if (!discovered) {
      existing?.remove();
      return;
    }
    const text = String(count);
    if (existing) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }
    const badge = document.createElement("span");
    badge.className = "crit-info-tile__count-badge";
    badge.textContent = text;
    tile.append(badge);
  }

  // one screenful at a time; the sentinel below the last tile pulls in the next
  // page as it scrolls into reach
  const PAGE_SIZE = 60;

  function appendPage(): void {
    const page = BADGE_INFO.slice(renderedCount, renderedCount + PAGE_SIZE);
    if (page.length === 0) {
      pageObserver?.unobserve(sentinel);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const { kind, label } of page) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "crit-info-tile";
      tile.dataset.kind = kind;
      tile.setAttribute("aria-label", label);
      const image = document.createElement("img");
      image.className = "crit-info-tile__icon";
      image.alt = "";
      tile.append(image);
      // sets dataset.src to the artwork or the silhouette, whichever applies
      applyDiscovery(tile, kind, getCritProcCount(kind));
      tiles.set(kind, tile);
      fragment.append(tile);
      if (iconObserver) iconObserver.observe(image);
      else image.src = image.dataset.src ?? "";
    }
    renderedCount += page.length;
    grid.insertBefore(fragment, sentinel);
    if (renderedCount >= BADGE_INFO.length) {
      pageObserver?.unobserve(sentinel);
      sentinel.remove();
      return;
    }
    // re-arm: if the page that just landed still doesn't fill the scroller the
    // sentinel stays intersecting, which on its own fires no second callback
    pageObserver?.unobserve(sentinel);
    pageObserver?.observe(sentinel);
  }

  function buildGrid(): void {
    if (renderedCount > 0) return;
    grid.append(sentinel);
    const scrollRoot = grid.parentElement;
    if (scrollRoot && "IntersectionObserver" in window) {
      iconObserver = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const image = entry.target as HTMLImageElement;
            image.src = image.dataset.src ?? "";
            observer.unobserve(image);
          }
        },
        { root: scrollRoot, rootMargin: "160px" },
      );
      pageObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) appendPage();
        },
        { root: scrollRoot, rootMargin: "400px" },
      );
      appendPage();
      pageObserver.observe(sentinel);
      return;
    }
    while (renderedCount < BADGE_INFO.length) appendPage();
  }

  function syncBadges(): void {
    for (const [kind, tile] of tiles)
      applyDiscovery(tile, kind, getCritProcCount(kind));
  }

  function detailStats(kind: CritProcKind): {
    landed: string;
    landedNone: boolean;
    modifier: string;
    nextLabel: string;
    nextBoost: string;
  } {
    const count = getCritProcCount(kind);
    const incomeModifier = getCritProcIncomeModifierPercent(kind, count);
    const modifierStep = getCritProcIncomeModifierPercent(kind, 1);
    const nextThreshold = getCritProcNextMilestoneCount(count);
    return {
      landed: count > 0 ? `Collected ${count}\u00d7` : "Not yet discovered",
      landedNone: count === 0,
      modifier: `${formatBoostPercent(incomeModifier)} `,
      nextLabel: `Next boost: ${nextThreshold} collected (`,
      nextBoost: ` ${formatBoostPercent(modifierStep)} `,
    };
  }

  function renderDetail(): void {
    const info = BADGE_INFO.find(({ kind }) => kind === openKind);
    if (!info) return;
    detail.innerHTML = `
      <img src="${info.icon}" class="crit-info-detail__icon" alt="" />
      <h3 class="crit-info-detail__name">${info.label}</h3>
      <p class="crit-info-detail__description">${info.description}</p>
      <p class="crit-info-detail__count"></p>
      <p class="crit-info-detail__modifier">Income modifier <strong></strong></p>
      <p class="crit-info-detail__next"><span></span><strong></strong>)</p>
    `;
    syncDetail();
  }

  // only the live-state numbers change between refreshes — rewriting the whole
  // card would swap out its (large) icon element and re-decode it
  function syncDetail(): void {
    if (!openKind) return;
    const stats = detailStats(openKind);
    const landed = detail.querySelector<HTMLElement>(
      ".crit-info-detail__count",
    );
    if (landed) {
      landed.textContent = stats.landed;
      landed.classList.toggle(
        "crit-info-detail__count--none",
        stats.landedNone,
      );
    }
    const modifier = detail.querySelector<HTMLElement>(
      ".crit-info-detail__modifier strong",
    );
    if (modifier) modifier.textContent = stats.modifier;
    const nextLabel = detail.querySelector<HTMLElement>(
      ".crit-info-detail__next span",
    );
    if (nextLabel) nextLabel.textContent = stats.nextLabel;
    const nextBoost = detail.querySelector<HTMLElement>(
      ".crit-info-detail__next strong",
    );
    if (nextBoost) nextBoost.textContent = stats.nextBoost;
  }

  // the track carries the whole grid, so hint the compositor for the duration
  // of the slide only — leaving will-change on permanently keeps a layer of
  // several hundred tiles alive for nothing
  let slideTimer: number | null = null;

  function slide(toDetail: boolean): void {
    slider.classList.add("crit-info-slider--sliding");
    slider.classList.toggle("crit-info-slider--detail", toDetail);
    if (slideTimer !== null) clearTimeout(slideTimer);
    slideTimer = window.setTimeout(() => {
      slider.classList.remove("crit-info-slider--sliding");
      slideTimer = null;
    }, 320);
  }

  function showDetail(kind: CritProcKind): void {
    openKind = kind;
    renderDetail();
    detail.parentElement?.scrollTo({ top: 0 });
    slide(true);
    backButton.hidden = false;
    playSwoosh();
  }

  function showGrid(): void {
    openKind = null;
    syncBadges();
    slide(false);
    backButton.hidden = true;
    playSwoosh();
  }

  // one delegated handler instead of one per tile, so pages can be appended to
  // the grid without rewiring anything. The tap events are synthesised rather
  // than native clicks, so an undiscovered tile's `disabled` has to be checked
  // here too.
  onTapOrClick(grid, (event) => {
    const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      ".crit-info-tile",
    );
    if (!tile || (tile as HTMLButtonElement).disabled) return;
    const kind = tile.dataset.kind as CritProcKind | undefined;
    if (kind) showDetail(kind);
  });

  onTapOrClick(backButton, () => showGrid());

  // opened by a tap on the action bar's own Boost button — same trailing-
  // click-hits-the-new-backdrop risk any button-opened dialog has
  const ghostClickGuard = createGhostClickGuard();

  function open(): void {
    cancelDialogClose(panel);
    panel.classList.remove("worker-menu__panel--closing");
    void panel.offsetWidth;
    showGrid();
    buildGrid();
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
  // is live game state — re-read via getCritProcCount() on every render. Only
  // the visible pane is worth touching, and only its numbers ever change.
  function refresh(): void {
    if (menu.hidden) return;
    if (openKind) syncDetail();
    else syncBadges();
  }

  return { open, close, refresh };
}
