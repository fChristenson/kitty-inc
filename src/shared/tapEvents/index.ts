// Mobile browsers can silently swallow the synthesized "click" that would
// normally follow a tap right after a drag/swipe gesture elsewhere on the
// page (confirmed via an on-screen debug log: pointerdown/pointerup always
// fired, "click" sometimes just didn't) — but on OTHER taps "click" still
// fires normally, ~50-100ms after pointerup, so relying on pointerup alone
// instead just trades one bug for another (that later click can land on
// newly-changed DOM, e.g. a dialog's own backdrop, closing it right back up).
// Firing on whichever of pointerup/click shows up FIRST for a gesture, and
// ignoring the other one, covers both cases without depending on either
// event being reliably suppressed. Use this instead of a raw "click"
// listener for every button/list/backdrop tap target in the game.
export function onTapOrClick(
  target: Pick<HTMLElement, "addEventListener">,
  handler: (event: Event) => void,
): void {
  let fired = false;
  target.addEventListener("pointerdown", () => {
    fired = false;
  });
  function fireOnce(event: Event): void {
    if (fired) return;
    fired = true;
    handler(event);
  }
  target.addEventListener("pointerup", fireOnce);
  target.addEventListener("click", fireOnce);
  // an aborted gesture shouldn't fire at all — marking it "already fired"
  // blocks a trailing click the browser might still send for it
  target.addEventListener("pointercancel", () => {
    fired = true;
  });
}
