// a small "+X%" label that fades in, floats up, then fades out — the DOM
// equivalent of floors/incomeFloatText's own canvas version, for HUD dialogs
// (corporationBoostMenu) with no canvas of their own to draw text onto.
// anchor is whatever element the label should rise from (e.g. a button just
// pressed); container must be a non-static-positioned ancestor the label's
// own "position: absolute" resolves against, stable enough to survive
// anchor's own DOM churn (e.g. a full list.innerHTML rebuild mid-hold)
export function spawnFloatingLabel(
  anchor: HTMLElement,
  container: HTMLElement,
  text: string,
): void {
  const anchorRect = anchor.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const label = document.createElement("span");
  label.className = "floating-label";
  label.textContent = text;
  label.style.left = `${anchorRect.left + anchorRect.width / 2 - containerRect.left}px`;
  label.style.top = `${anchorRect.top - containerRect.top}px`;
  container.appendChild(label);
  label.addEventListener("animationend", () => label.remove(), { once: true });
}
