import type { Floor } from "../../gameState";
import { clearBuildings } from "../../gameState";
import { clearTotalIncome } from "../../totalIncome";
import { clearCityNames } from "../../cityName";
import { clearCorporationNames } from "../../corporationName";
import { clearStockPrices } from "../corporationBoostMenu";

// dev/test-only controls, not part of the real game UI
export function createTestButtonMarkup(): string {
  return `
    <div class="test-actions-bar">
      <button id="add-money" class="game__button">Add Money</button>
      <button id="spawn-mouse" class="game__button">Spawn Mouse</button>
      <button id="spawn-crit" class="game__button">Spawn Crit</button>
      <button id="trigger-idle-popup" class="game__button">Idle Popup</button>
      <button id="test-press-conference" class="game__button">Press Conf Game</button>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>
  `;
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-money")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMouseButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-mouse")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-crit")!;
  button.addEventListener("click", onClick);
}

export function wireIdlePopupTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#trigger-idle-popup",
  )!;
  button.addEventListener("click", onClick);
}

export function wirePressConferenceTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-press-conference",
  )!;
  button.addEventListener("click", onClick);
}

export function wireResetButton(
  container: HTMLElement,
  buildings: Floor[][],
  getActiveCompanyIndex: () => number,
): void {
  const button = container.querySelector<HTMLButtonElement>("#reset-game")!;
  button.addEventListener("click", () => {
    // also truncate the in-memory array: main.ts's beforeunload handler persists
    // buildings on the way out, and without this it would just re-save the stale data
    // right after clearBuildings() removes it, undoing the reset before the reload
    // even happens
    buildings.length = 0;
    clearBuildings(getActiveCompanyIndex());
    clearTotalIncome();
    clearCityNames();
    // clearStockPrices reads getCorporationCount, so it must run before
    // clearCorporationNames resets that count back down to a fresh single company
    clearStockPrices();
    clearCorporationNames();
    location.reload();
  });
}
