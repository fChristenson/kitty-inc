import { buildFloor, type Floor } from "./floors";
import type { FurnitureSprite } from "./sprites";
import { clearFloors } from "./gameState";
import { clearTotalIncome } from "./totalIncome";

// the "Add Floor" / "Reset Game" dev/test controls
export function createTestButtonMarkup(): string {
  return `
    <div class="game__test-controls">
      <button id="add-floor" class="game__button">Add Floor</button>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>
  `;
}

interface AddFloorDeps {
  floors: Floor[];
  sprites: FurnitureSprite[];
  scrollEl: HTMLElement;
  onChange: () => void;
}

export function addFloor(deps: AddFloorDeps): void {
  const scrollHeightBefore = deps.scrollEl.scrollHeight;
  deps.floors.push(buildFloor(deps.sprites, deps.floors.length + 1));
  deps.onChange();
  // new floors render above existing ones, so compensate scrollTop by the added
  // height to keep whatever the user was looking at (e.g. the ground floor) in place
  deps.scrollEl.scrollTop += deps.scrollEl.scrollHeight - scrollHeightBefore;
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-floor")!;
  button.addEventListener("click", onClick);
}

export function wireResetButton(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>("#reset-game")!;
  button.addEventListener("click", () => {
    clearFloors();
    clearTotalIncome();
    location.reload();
  });
}
