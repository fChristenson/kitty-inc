// The rig's panel: pick scenarios, run them, read the results against a saved
// baseline. Results and the baseline live in real localStorage.
import type { Summary } from "./metrics";
import { realStorage } from "./storage";

const LAST_KEY = "perf-rig:last";
const BASELINE_KEY = "perf-rig:baseline";

export function loadResults(key: "last" | "baseline"): Summary[] {
  const raw = realStorage.getItem(key === "last" ? LAST_KEY : BASELINE_KEY);
  return raw ? (JSON.parse(raw) as Summary[]) : [];
}

export function saveResults(
  key: "last" | "baseline",
  results: Summary[],
): void {
  realStorage.setItem(
    key === "last" ? LAST_KEY : BASELINE_KEY,
    JSON.stringify(results),
  );
}

export interface PanelActions {
  scenarios: { name: string; about: string }[];
  // crit mode -> what it means; every selected scenario runs once per mode
  critModes: Record<string, string>;
  onRun: (names: string[]) => void;
  onReseed: () => void;
  environment: string;
}

const fixed = (n: number, digits = 1) => n.toFixed(digits);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

// worse by more than this share shows red, better shows green
const NOISE = 0.1;
function delta(now: number, before: number | undefined, lowerIsBetter = true) {
  if (before === undefined || before === 0) return "";
  const change = (now - before) / before;
  if (Math.abs(change) < NOISE) return ` <span class="same">±</span>`;
  const worse = lowerIsBetter ? change > 0 : change < 0;
  return ` <span class="${worse ? "worse" : "better"}">${change > 0 ? "+" : ""}${Math.round(change * 100)}%</span>`;
}

function row(s: Summary, base: Summary | undefined): string {
  const draws = Object.values(s.calls).reduce((sum, n) => sum + n, 0);
  const baseDraws = base
    ? Object.values(base.calls).reduce((sum, n) => sum + n, 0)
    : undefined;
  const calls = Object.entries(s.calls)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name} ${fixed(n)}`)
    .join(", ");
  const sources = s.canvasSources
    .map(([at, n]) => `<li>${n}× ${at}</li>`)
    .join("");
  // older saved results predate the timeline
  const timeline = (s.timeline ?? [])
    .map((slot) => `${fixed(slot.fps, 0)}/${fixed(slot.worst, 0)}`)
    .join(" · ");
  return `
    <tr>
      <td title="${s.ms.toFixed(0)}ms, ${s.frames} frames">${s.name}</td>
      <td>${fixed(s.fps, 0)}${delta(s.fps, base?.fps, false)}</td>
      <td>${fixed(s.frame.p95)}${delta(s.frame.p95, base?.frame.p95)}</td>
      <td>${pct(s.over20)}</td>
      <td>${s.hitches}</td>
      <td>${fixed(s.redraw.avg, 2)}${delta(s.redraw.avg, base?.redraw.avg)}</td>
      <td>${fixed(s.redraw.p95, 2)}</td>
      <td>${fixed(draws, 0)}${delta(draws, baseDraws)}</td>
      <td>${s.canvases}</td>
      <td>${s.gcs} / ${fixed(s.gcMb)}MB</td>
    </tr>
    <tr class="details"><td colspan="10">
      <details><summary>details</summary>
        frame avg ${fixed(s.frame.avg)} · p50 ${fixed(s.frame.p50)} · p99 ${fixed(s.frame.p99)} · max ${fixed(s.frame.max)} ·
        &gt;33ms ${pct(s.over33)} · long tasks ${s.longTasks} (${fixed(s.longTaskMs, 0)}ms) ·
        redraw max ${fixed(s.redraw.max, 1)} · bitmaps ${s.bitmaps} · heap ${fixed(s.heapStartMb)}→${fixed(s.heapEndMb)}MB
        ${s.canvasMb === undefined ? "" : `· live canvases ${s.liveCanvases} (${fixed(s.canvasMb)}MB)`}
        <div>per frame: ${calls || "(counting off)"}</div>
        ${timeline ? `<div>each 0.5s, fps/worst frame ms: ${timeline}</div>` : ""}
        ${sources ? `<div>canvases made by:</div><ul>${sources}</ul>` : ""}
      </details>
    </td></tr>`;
}

export function renderResults(
  target: HTMLElement,
  results: Summary[],
  baseline: Summary[],
): void {
  if (results.length === 0) {
    target.innerHTML = "<p>No results yet.</p>";
    return;
  }
  const byName = new Map(baseline.map((s) => [s.name, s]));
  target.innerHTML = `
    <table>
      <thead><tr>
        <th>scenario</th><th>fps</th><th title="95th percentile frame time, ms">p95</th>
        <th title="frames over 20ms">&gt;20</th><th title="frames over 50ms">hitch</th>
        <th title="game redraw JS per frame, ms">draw</th><th>draw p95</th>
        <th title="canvas calls per frame">calls</th><th title="canvases created">cnv</th><th>GC</th>
      </tr></thead>
      <tbody>${results.map((s) => row(s, byName.get(s.name))).join("")}</tbody>
    </table>`;
}

export function mountPanel(actions: PanelActions): {
  showResults: (results: Summary[]) => void;
} {
  const panel = document.createElement("aside");
  panel.id = "perf-panel";
  const options = actions.scenarios
    .map(
      (s) =>
        `<label title="${s.about}"><input type="checkbox" value="${s.name}" ${s.name === "events-all" || s.name === "late" ? "" : "checked"} /> ${s.name}</label>`,
    )
    .join("");
  const modes = Object.entries(actions.critModes)
    .map(
      ([mode, about]) =>
        `<label title="${about}"><input type="checkbox" value="${mode}" ${mode === "on" ? "checked" : ""} /> crits ${mode}</label>`,
    )
    .join("");
  panel.innerHTML = `
    <header>
      <b>Perf rig</b>
      <button id="perf-toggle" title="hide/show">▾</button>
    </header>
    <div id="perf-body">
      <p class="env">${actions.environment}</p>
      <div class="scenarios">${options}</div>
      <div class="scenarios modes">${modes}</div>
      <div class="buttons">
        <button id="perf-run">Run selected</button>
        <button id="perf-none">None</button>
        <button id="perf-reseed" title="rebuild the save fixture from a fresh game">Reseed</button>
      </div>
      <div id="perf-results"></div>
      <div class="buttons">
        <button id="perf-baseline">Save as baseline</button>
        <button id="perf-copy">Copy JSON</button>
      </div>
    </div>`;
  document.body.append(panel);
  const results = panel.querySelector<HTMLElement>("#perf-results")!;
  let shown: Summary[] = [];
  const showResults = (list: Summary[]) => {
    shown = list;
    renderResults(results, list, loadResults("baseline"));
  };
  panel.querySelector("#perf-toggle")!.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
  });
  panel.querySelector("#perf-none")!.addEventListener("click", () => {
    for (const box of panel.querySelectorAll<HTMLInputElement>(
      ".scenarios:not(.modes) input",
    ))
      box.checked = false;
  });
  panel.querySelector("#perf-run")!.addEventListener("click", () => {
    const names = [
      ...panel.querySelectorAll<HTMLInputElement>(
        ".scenarios:not(.modes) input:checked",
      ),
    ].map((box) => box.value);
    const modes = [
      ...panel.querySelectorAll<HTMLInputElement>(".modes input:checked"),
    ].map((box) => box.value);
    // startup runs before any crit could land: once is enough
    const runs = (modes.length ? modes : ["on"]).flatMap((mode) =>
      names
        .filter((name) => mode === "on" || name !== "startup")
        .map((name) => (mode === "on" ? name : `${name}@${mode}`)),
    );
    if (runs.length) actions.onRun(runs);
  });
  panel
    .querySelector("#perf-reseed")!
    .addEventListener("click", actions.onReseed);
  panel.querySelector("#perf-baseline")!.addEventListener("click", () => {
    saveResults("baseline", shown);
    showResults(shown);
  });
  panel.querySelector("#perf-copy")!.addEventListener("click", () => {
    void navigator.clipboard.writeText(JSON.stringify(shown, null, 2));
  });
  return { showResults };
}
