// Holds back non-urgent work (asset warm-ups, audio, idle saves) until the
// startup screen has painted and its intro animation has finished.

let settled = false;
const waiting: (() => void)[] = [];

export function isStartupSettled(): boolean {
  return settled;
}

export function afterStartup(task: () => void): void {
  if (settled) task();
  else waiting.push(task);
}

export function markStartupSettled(): void {
  if (settled) return;
  settled = true;
  for (const task of waiting.splice(0)) task();
}

// resolves once the document and everything it loads has finished (window "load")
export function whenDocumentReady(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) =>
    window.addEventListener("load", () => resolve(), { once: true }),
  );
}
