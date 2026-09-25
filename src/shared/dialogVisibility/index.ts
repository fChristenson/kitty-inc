// Whether any modal `.worker-menu` dialog is currently shown, kept up to date
// by one attribute observer instead of querying the DOM from every frame.

let openDialogCount = 0;
let observer: MutationObserver | null = null;

function recount(): void {
  openDialogCount = document.querySelectorAll(".worker-menu:not([hidden])")
    .length;
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
