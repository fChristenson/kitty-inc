import "./style.css";

export function createLoadingOverlay(anchor: HTMLElement, label: string) {
  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  const spinner = document.createElement("span");
  spinner.className = "loading-overlay__spinner";
  spinner.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  overlay.append(spinner, text);
  document.body.append(overlay);

  function resize(): void {
    if (overlay.hidden) return;
    const rect = anchor.getBoundingClientRect();
    Object.assign(overlay.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
  const observer = new ResizeObserver(resize);
  observer.observe(anchor);
  window.addEventListener("resize", resize);
  return {
    show(visible: boolean): void {
      overlay.hidden = !visible;
      anchor.setAttribute("aria-busy", String(visible));
      resize();
    },
    destroy(): void {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      anchor.removeAttribute("aria-busy");
      overlay.remove();
    },
  };
}
