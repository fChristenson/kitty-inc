import type { Floor } from "../../gameState";
import { clearBuildings } from "../../gameState";
import { clearTotalIncome } from "../../totalIncome";

// the "Add Money" / "Reset Game" dev/test controls
export function createTestButtonMarkup(): string {
  return `
    <div class="game__test-controls">
      <button id="add-money" class="game__button">Add Money</button>
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

export function wireResetButton(
  container: HTMLElement,
  buildings: Floor[][],
): void {
  const button = container.querySelector<HTMLButtonElement>("#reset-game")!;
  button.addEventListener("click", () => {
    // also truncate the in-memory array: main.ts's beforeunload handler persists
    // buildings on the way out, and without this it would just re-save the stale data
    // right after clearBuildings() removes it, undoing the reset before the reload
    // even happens
    buildings.length = 0;
    clearBuildings();
    clearTotalIncome();
    location.reload();
  });
}
