import { formatPrice } from "../utils";

// the confirm dialog shown once on load when idleIncome (gameState.ts's
// computeIdleIncome) found $ earned while the page was closed

export function createPopupMarkup(): string {
  return `
    <div class="popup" id="idle-popup" hidden>
      <div class="popup__backdrop"></div>
      <div class="popup__panel">
        <h2>Welcome back!</h2>
        <p>While you were away, your building earned:</p>
        <p class="popup__amount" id="idle-popup-amount"></p>
        <button class="popup__button" id="idle-popup-ok">OK</button>
      </div>
    </div>
  `;
}

// shows the dialog with the given idle income amount; onConfirm fires once, when the
// user clicks OK, and is the only place the caller should add the amount to the total
export function showIdlePopup(
  container: HTMLElement,
  idleIncome: number,
  onConfirm: () => void,
): void {
  const popup = container.querySelector<HTMLDivElement>("#idle-popup")!;
  const amountEl =
    container.querySelector<HTMLParagraphElement>("#idle-popup-amount")!;
  const okButton =
    container.querySelector<HTMLButtonElement>("#idle-popup-ok")!;

  amountEl.textContent = formatPrice(idleIncome);
  popup.hidden = false;

  okButton.addEventListener(
    "click",
    () => {
      popup.hidden = true;
      onConfirm();
    },
    { once: true },
  );
}
