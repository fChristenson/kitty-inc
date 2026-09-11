import { formatPrice, animateDialogClose } from "../../utils";
import {
  getAllCompaniesTotalIncome,
  spendFromAllCompanies,
} from "../../totalIncome";
import { playSwoosh, playSold } from "../../sound";
import { getImageUrl } from "../../loadAssets";
import { getManagerIconUrl } from "../../floors";
import { gte } from "../../shared/bigNumber";
import { createPollingLoop } from "../../shared/pollingLoop";

const coinIconUrl = getImageUrl("coin");
const shieldIconUrl = getImageUrl("shield");
import {
  getMinigameEntryCost,
  getFreePressConferenceCount,
  holdPressConference,
} from "./economy";

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

// reuses .worker-menu's styling — a dialog listing this company's various
// income-boost purchases/minigames (see render() below)
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
  // opens the Liquidate Assets mini game (see hud/liquidateAssetsGame) — free
  // to play, unlike "Hold press conference" which costs $ up front; its own
  // reward is entirely performance-based (see that module's own influence gain)
  onOpenLiquidateAssets?: () => void,
  // opens the Declare Taxes mini game (see hud/payTaxes) — same up-front entry
  // cost/gating as the other two minigame buttons above
  onOpenPayTaxes?: () => void,
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
    const minigameEntryCost = getMinigameEntryCost();
    const freePressConferenceCount = getFreePressConferenceCount();
    // computed once and reused below — getAllCompaniesTotalIncome() is itself
    // O(companies) (a localStorage read + JSON.parse per company), so calling
    // it again inside the per-company items loop made render() scale
    // O(companies^2)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const minigameEntryAffordable =
      freePressConferenceCount > 0 ||
      gte(allCompaniesTotalIncome, minigameEntryCost);
    const minigameEntryPriceLabel =
      freePressConferenceCount > 0
        ? `FREE (x${freePressConferenceCount})`
        : formatPrice(minigameEntryCost);
    list.innerHTML = `
      <button
        class="worker-menu__item"
        id="press-conference-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${managerIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Hold press conference</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="liquidate-assets-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${shieldIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Secure stock price</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
      <button
        class="worker-menu__item"
        id="declare-taxes-item"
        ${minigameEntryAffordable ? "" : "disabled"}
      >
        <span class="worker-menu__item-label">
          <img src="${coinIconUrl}" class="worker-menu__icon" alt="" />
          <span class="worker-menu__item-name">Declare taxes</span>
        </span>
        <span class="worker-menu__price">${minigameEntryPriceLabel}</span>
      </button>
    `;
    list.scrollTop = scrollTop;
  }

  // single-shot (not press-and-hold, unlike a per-floor purchase elsewhere) —
  // one press conference at a time makes sense given its own 30-minute-income cost
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#press-conference-item");
    if (!button || button.disabled) return;
    if (!holdPressConference()) return;
    playSold();
    render();
    pauseAffordabilityPolling();
    onPressConferenceHeld?.();
  });

  // shows/costs the same as press conference (see minigameEntryPriceLabel in
  // render()) and is gated by the same affordability check, but (unlike the
  // free press conference) actually spends the cost itself right here —
  // there's no separate holdX-style helper for it since it doesn't touch the
  // free-conference credit pool
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#liquidate-assets-item");
    if (!button || button.disabled) return;
    if (!spendFromAllCompanies(getMinigameEntryCost())) return;
    playSold();
    pauseAffordabilityPolling();
    onOpenLiquidateAssets?.();
  });

  // same shared entry cost/spend pattern as liquidate-assets-item above
  list.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("#declare-taxes-item");
    if (!button || button.disabled) return;
    if (!spendFromAllCompanies(getMinigameEntryCost())) return;
    playSold();
    pauseAffordabilityPolling();
    onOpenPayTaxes?.();
  });

  // re-checks affordability while the menu sits open, same as boostMenu.ts's own
  // updateAffordability, so a grayed-out item turns clickable again as soon as
  // income catches up instead of only refreshing on the next open/purchase
  function updateAffordability(): void {
    // same hoist-out-of-the-loop fix as render() above — getMinigameEntryCost()
    // itself calls getAllCompaniesIncomeRatePerSecond(), which for the active
    // company walks every one of its floors, so calling it separately for
    // each of the 4 minigame buttons below quadrupled that cost every single
    // tick of this interval (it keeps running even while a minigame is being
    // played on top of this still-open menu)
    const allCompaniesTotalIncome = getAllCompaniesTotalIncome();
    const minigameEntryCost = getMinigameEntryCost();
    const minigameEntryAffordable =
      getFreePressConferenceCount() > 0 ||
      gte(allCompaniesTotalIncome, minigameEntryCost);
    const pressConferenceButton = list.querySelector<HTMLButtonElement>(
      "#press-conference-item",
    );
    if (pressConferenceButton) {
      pressConferenceButton.disabled = !minigameEntryAffordable;
    }
    // shows/costs the same as press conference (see minigameEntryPriceLabel
    // in render()), so it's gated by the exact same affordability check
    const liquidateAssetsButton = list.querySelector<HTMLButtonElement>(
      "#liquidate-assets-item",
    );
    if (liquidateAssetsButton) {
      liquidateAssetsButton.disabled = !minigameEntryAffordable;
    }
    const declareTaxesButton = list.querySelector<HTMLButtonElement>(
      "#declare-taxes-item",
    );
    if (declareTaxesButton) {
      declareTaxesButton.disabled = !minigameEntryAffordable;
    }
  }

  const affordabilityPolling = createPollingLoop(updateAffordability, 250);

  // stopped right as any minigame opens on top of this still-open menu —
  // otherwise this kept polling (and, worse, kept recomputing every
  // minigame button's own entry cost) every 250ms the whole time a game was
  // being played, competing with that game's own render loop for no visible
  // benefit (the menu is covered up the whole time anyway)
  function pauseAffordabilityPolling(): void {
    affordabilityPolling.stop();
  }

  function resumeAffordabilityPolling(): void {
    if (!menu.hidden) affordabilityPolling.start();
  }

  function open(): void {
    render();
    menu.hidden = false;
    playSwoosh();
    resumeAffordabilityPolling();
  }

  async function close(): Promise<void> {
    playSwoosh();
    await animateDialogClose(panel);
    menu.hidden = true;
    pauseAffordabilityPolling();
  }

  backdrop.addEventListener("click", close);

  // called by main.ts once a minigame closes back to this menu — resumes the
  // polling pauseAffordabilityPolling stopped when that minigame opened
  function refresh(): void {
    render();
    resumeAffordabilityPolling();
  }

  return { open, close, refresh };
}
