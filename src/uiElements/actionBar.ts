// the fixed action bar overlaying the bottom of the viewport, independent of any
// floor/scroll position — its own DOM controls, styled via .action-bar in style.css

export function createActionBarMarkup(): string {
  return `
    <div class="action-bar" id="action-bar">
      <button
        class="action-bar__button"
        id="action-bar-scroll-top"
        aria-label="Scroll to the top floor"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
      <button
        class="action-bar__button"
        id="action-bar-scroll-bottom"
        aria-label="Scroll to the ground floor"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12l7 7 7-7" />
        </svg>
      </button>
      <button
        class="action-bar__button action-bar__button--boost"
        id="action-bar-boost-all"
        aria-label="Boost every worker"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
        </svg>
      </button>
      <button
        class="action-bar__button action-bar__button--hire"
        id="action-bar-hire"
        aria-label="Hire workers"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  `;
}

export interface ActionBarHandlers {
  onScrollTop: () => void;
  onScrollBottom: () => void;
  onBoostAll: () => void;
  onOpenHireMenu: () => void;
}

export function wireActionBar(
  container: HTMLElement,
  handlers: ActionBarHandlers,
): void {
  container
    .querySelector<HTMLButtonElement>("#action-bar-scroll-top")!
    .addEventListener("click", handlers.onScrollTop);
  container
    .querySelector<HTMLButtonElement>("#action-bar-scroll-bottom")!
    .addEventListener("click", handlers.onScrollBottom);
  container
    .querySelector<HTMLButtonElement>("#action-bar-boost-all")!
    .addEventListener("click", handlers.onBoostAll);
  container
    .querySelector<HTMLButtonElement>("#action-bar-hire")!
    .addEventListener("click", handlers.onOpenHireMenu);
}
