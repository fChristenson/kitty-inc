// TEMPORARY diagnostic overlay for the "action bar tap does nothing" bug —
// no console access on the phone reproducing it, so this puts the same info
// directly on screen instead. Remove this whole module + its main.ts call
// once the bug is found; not gated to dev mode since it must run in production.

const MAX_LINES = 10;
const lines: string[] = [];
let el: HTMLPreElement | null = null;

function render(): void {
  if (el) el.textContent = lines.join("\n");
}

function log(line: string): void {
  const t = new Date().toISOString().split("T")[1]!.replace("Z", "");
  lines.push(`${t} ${line}`);
  if (lines.length > MAX_LINES) lines.shift();
  render();
}

export function installDebugOverlay(): void {
  el = document.createElement("pre");
  el.id = "debug-overlay";
  Object.assign(el.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "99999",
    margin: "0",
    padding: "4px 6px",
    fontSize: "10px",
    lineHeight: "1.3",
    color: "#0f0",
    background: "rgba(0,0,0,0.85)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    pointerEvents: "none",
    maxHeight: "40vh",
    overflow: "hidden",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);

  log("debug overlay installed");

  // capture phase, on window — sees EVERY pointer/click event on the page
  // before anything else can stop/consume it, so this proves whether the
  // browser ever dispatched the event at all, and exactly what element it
  // says was the target
  const describe = (e: Event): string => {
    const t = e.target;
    if (t instanceof Element) {
      return t.id ? `#${t.id}` : t.tagName.toLowerCase();
    }
    return String(t);
  };
  window.addEventListener(
    "pointerdown",
    (e) => log(`pointerdown -> ${describe(e)}`),
    true,
  );
  window.addEventListener(
    "pointerup",
    (e) => log(`pointerup -> ${describe(e)}`),
    true,
  );
  window.addEventListener(
    "pointercancel",
    (e) => log(`pointercancel -> ${describe(e)}`),
    true,
  );
  window.addEventListener("click", (e) => log(`click -> ${describe(e)}`), true);

  window.addEventListener("error", (e) => {
    log(`ERROR: ${e.message} @ ${e.filename}:${e.lineno}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    log(`REJECTION: ${String(e.reason)}`);
  });
}

// call once right after wireActionBar — confirms each button element was
// actually found (non-null) and got a listener attached, proving whether the
// wiring itself ever ran successfully at all
export function logActionBarWired(ids: string[]): void {
  for (const id of ids) {
    const found = document.getElementById(id) !== null;
    log(`wireActionBar: #${id} ${found ? "found+wired" : "MISSING"}`);
  }
}

// call from inside a handler itself, proving the JS callback actually ran
// (not just that a DOM click/pointer event fired somewhere)
export function logHandlerFired(name: string): void {
  log(`HANDLER FIRED: ${name}`);
}

