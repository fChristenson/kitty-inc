import { buildFloor } from "./floors";
import type { Floor } from "../gameState";
import type { FurnitureSprite } from "../sprites/furnitureSprites";
import { clearFloors } from "../gameState";
import { clearTotalIncome } from "./totalIncome";

// the "Add Money" / "Reset Game" dev/test controls
export function createTestButtonMarkup(): string {
  return `
    <div class="game__test-controls">
      <button id="add-money" class="game__button">Add Money</button>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>
  `;
}

interface AddFloorDeps {
  floors: Floor[];
  sprites: FurnitureSprite[];
  onAdd: (floor: Floor) => void;
}

// each floor is a real, fixed-size DOM canvas, so growing the building is just adding
// an element — no scroll-position math needed, native scroll anchoring keeps the view put
export function addFloor(deps: AddFloorDeps): void {
  const floor = buildFloor(deps.sprites, deps.floors.length + 1);
  deps.floors.push(floor);
  deps.onAdd(floor);
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-money")!;
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
