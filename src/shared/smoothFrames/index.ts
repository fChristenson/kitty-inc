// waits for a moment the browser can animate smoothly: the page is visible,
// the main thread has had an idle moment, and STEADY frames in a row each
// came within FRAME_MS of the last (startup's module loading, image uploads
// and first draws are over). Gives up and resolves anyway MAX_WAIT_MS after
// the page is visible, so a slow device still gets there
const FRAME_MS = 20;
const STEADY = 6;
const IDLE_TIMEOUT_MS = 1000;
const MAX_WAIT_MS = 3000;

export function whenFramesSmooth(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let cap = 0;
    const finish = (): void => {
      if (done) return;
      done = true;
      window.clearTimeout(cap);
      resolve();
    };
    const watchFrames = (): void => {
      let last = 0;
      let steady = 0;
      const frame = (t: number): void => {
        if (done) return;
        steady = last && t - last <= FRAME_MS ? steady + 1 : 0;
        last = t;
        if (steady >= STEADY) finish();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const start = (): void => {
      cap = window.setTimeout(finish, MAX_WAIT_MS);
      if (typeof requestIdleCallback === "function")
        requestIdleCallback(watchFrames, { timeout: IDLE_TIMEOUT_MS });
      else setTimeout(watchFrames, 50);
    };
    if (!document.hidden) {
      start();
      return;
    }
    const onVisible = (): void => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible);
      start();
    };
    document.addEventListener("visibilitychange", onVisible);
  });
}
