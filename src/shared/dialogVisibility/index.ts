// Whether any modal `.worker-menu` dialog is currently shown, kept up to date
// by one attribute observer instead of querying the DOM from every frame.

let openDialogCount = 0;
let observer: MutationObserver | null = null;

function recount(): void {
  openDialogCount = document.querySelectorAll(
    ".worker-menu:not([hidden])",
  ).length;
}

function ensureObserving(): void {
  if (observer) return;
  observer = new MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.target instanceof Element &&
          record.target.classList.contains("worker-menu"),
      )
    )
      recount();
  });
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
  recount();
}

export function isDialogOpen(): boolean {
  ensureObserving();
  return openDialogCount > 0;
}

// panels mid slide-in/out (see style.css's worker-menu-slide keyframes), by
// start time: one whose end event never comes stops counting after a second
const slidingPanels = new Map<EventTarget, number>();
const MAX_SLIDE_MS = 1000;
let listening = false;

function isSlide(event: AnimationEvent): boolean {
  return event.animationName.startsWith("worker-menu-slide");
}

// true while a dialog panel slides in or out: the canvas behind it can wait,
// so the slide gets the main thread and the GPU to itself
export function isDialogSliding(): boolean {
  if (!listening) {
    listening = true;
    document.addEventListener("animationstart", (event) => {
      if (isSlide(event) && event.target)
        slidingPanels.set(event.target, performance.now());
    });
    const end = (event: AnimationEvent): void => {
      if (isSlide(event) && event.target) slidingPanels.delete(event.target);
    };
    document.addEventListener("animationend", end);
    document.addEventListener("animationcancel", end);
  }
  if (slidingPanels.size === 0) return false;
  const now = performance.now();
  for (const [panel, startedAt] of slidingPanels)
    if (now - startedAt > MAX_SLIDE_MS) slidingPanels.delete(panel);
  return slidingPanels.size > 0;
}
