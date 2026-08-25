import { formatPrice } from "../utils";
import { spendTotalIncome, getTotalIncome } from "../totalIncome";

export const BADGE_COUNT = 20;
const BASE_BADGE_COST = 1_000_000; // first badge: $1M
const BADGE_COST_MULTIPLIER = 10; // each subsequent badge costs 10x the previous one
const STORAGE_KEY = "cash-clicker:badges-bought";

export function getBadgeCost(index: number): number {
  return BASE_BADGE_COST * BADGE_COST_MULTIPLIER ** index;
}

function loadBoughtCount(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value)
      ? Math.min(Math.max(value, 0), BADGE_COUNT)
      : 0;
  } catch {
    return 0;
  }
}

function saveBoughtCount(count: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(count));
  } catch {
    // storage unavailable/full: persistence is a nice-to-have, safe to ignore
  }
}

let boughtCount = loadBoughtCount();

export function getBoughtBadgeCount(): number {
  return boughtCount;
}

export function clearBadges(): void {
  boughtCount = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

// badges are bought strictly in order (index 0 first); buys whichever one comes next
// if affordable, returns whether it succeeded
export function buyNextBadge(): boolean {
  if (boughtCount >= BADGE_COUNT) return false;
  if (!spendTotalIncome(getBadgeCost(boughtCount))) return false;
  boughtCount += 1;
  saveBoughtCount(boughtCount);
  return true;
}

// shared trophy glyph for both the action-bar button and each badge cell
const TROPHY_PATH = `
  <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
  <path d="M8 5H5a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
  <path d="M16 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
  <path d="M12 13v4" />
  <path d="M9 20h6" />
  <path d="M10 20v-3h4v3" />
`;

export function createBadgesMarkup(): string {
  return `
    <div class="worker-menu badges" id="badges-menu" hidden>
      <div class="worker-menu__backdrop" id="badges-menu-backdrop"></div>
      <div class="worker-menu__panel badges__panel">
        <div class="worker-menu__header">
          <h2>Badges</h2>
          <button class="worker-menu__close" id="badges-menu-close" aria-label="Close">&times;</button>
        </div>
        <div class="badges__grid" id="badges-grid"></div>
      </div>
    </div>
  `;
}

export interface BadgesMenu {
  open: () => void;
  close: () => void;
}

export function wireBadgesMenu(
  container: HTMLElement,
  onPurchase: () => void,
): BadgesMenu {
  const menu = container.querySelector<HTMLDivElement>("#badges-menu")!;
  const backdrop = container.querySelector<HTMLDivElement>(
    "#badges-menu-backdrop",
  )!;
  const closeButton =
    container.querySelector<HTMLButtonElement>("#badges-menu-close")!;
  const grid = container.querySelector<HTMLDivElement>("#badges-grid")!;

  function render(): void {
    const bought = getBoughtBadgeCount();
    grid.innerHTML = Array.from({ length: BADGE_COUNT }, (_, i) => {
      const isBought = i < bought;
      const isNext = i === bought;
      const cost = getBadgeCost(i);
      const affordable = isNext && getTotalIncome() >= cost;
      return `
        <button
          class="badge ${isBought ? "badge--bought" : ""}"
          data-index="${i}"
          ${isNext && affordable ? "" : "disabled"}
          title="Badge ${i + 1}"
        >
          <svg class="badge__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${TROPHY_PATH}
          </svg>
          <span class="badge__price">${isBought ? "" : formatPrice(cost)}</span>
        </button>
      `;
    }).join("");
  }

  grid.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-index]",
    );
    if (!button) return;
    if (Number(button.dataset.index) !== getBoughtBadgeCount()) return;
    if (buyNextBadge()) {
      onPurchase();
      render();
    }
  });

  // re-checks the next badge's affordability while the menu sits open so a grayed-out
  // "too expensive" one turns clickable again as soon as income catches up, instead of
  // only refreshing on the next open/purchase
  function updateAffordability(): void {
    const bought = getBoughtBadgeCount();
    const button = grid.querySelector<HTMLButtonElement>(
      `button[data-index="${bought}"]`,
    );
    if (button) button.disabled = getTotalIncome() < getBadgeCost(bought);
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  function open(): void {
    render();
    menu.hidden = false;
    refreshInterval = setInterval(updateAffordability, 250);
  }

  function close(): void {
    menu.hidden = true;
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  backdrop.addEventListener("click", close);
  closeButton.addEventListener("click", close);

  return { open, close };
}
