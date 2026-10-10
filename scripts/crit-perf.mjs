// Measures new crits: runs each in the perf rig in a headless browser with
// the CPU throttled like a phone, then reports what it costs per frame, where
// that time goes (a sampled profile of every run) and what in its code looks
// costly (scripts/perf-audit.mjs), marking the findings that came up hot.
//
//   node scripts/crit-perf.mjs                    the crits changed in git
//   node scripts/crit-perf.mjs claymoresCrit dyson-sphere goldenTicket
//   options: --throttle=4 --ref=volcanoCrit --counts (canvas calls per frame)
//            --url=http://localhost:5173/kitty-inc/perf/index.html
//            --desktop (no phone screen) --keep (leave the browser open) --json
//            --warm (only the warm runs); run:<name> measures any rig run
//            as is (run:idle for a baseline); --mode=on|frequent|tiers|off
//            sets the runs' crits (off by default)
//
// Each crit plays twice: cold (its first play after a page load) and warm
// (played once first), budgets checked on both.
//
// Targets: a floor or income crit kind (fooCrit), an event (foo-bar or
// fooBarEvent), any other crit kind (a proc or badge crit, at the top tier), or
// a rig run name (floor-crit:, income-crit:, event:, crit:). Needs the dev
// server (npx vite) or a perf preview behind --url. Results land in
// tmp/_crit-perf/last.json.
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { audit, formatFinding } from "./perf-audit.mjs";

const ROOT = process.cwd();
const FLOOR_CRITS = "src/crits/floorCrits/crits";
const INCOME_CRITS = "src/crits/incomeCrits/crits";
const EVENTS = "src/crits/animatedCrits/events";
const CRIT_DATA = "src/crits/badgeCrits/critData";
const OUT = path.join(ROOT, "tmp", "_crit-perf");

// budgets per run, at the run's throttle
const BUDGET = {
  frameP95: 33.4,
  redrawP95: 16,
  hitches: 0,
  longTasks: 0,
  canvases: 0,
  gcs: 2,
};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const throttle = Number(flag("throttle", "4"));
const url = flag("url", "http://localhost:5173/kitty-inc/perf/index.html");
const ref = flag("ref", "");
// the rig's crit mode for every run (perf/scenarios CRIT_MODES)
const mode = flag("mode", "off");
const desktop = args.includes("--desktop");
const keep = args.includes("--keep");
const json = args.includes("--json");
// only the warm runs (what every play costs), half the time
const warmOnly = args.includes("--warm");
// counting canvas calls costs time of its own, so it's opt-in
const counts = args.includes("--counts");

const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const camel = (id) => id.replace(/-(\w)/g, (_, c) => c.toUpperCase());

// a target as a rig run, and the source it plays from
function toRun(target) {
  // any rig run as it is, e.g. run:idle for a baseline
  if (target.startsWith("run:")) return { run: target.slice(4), dir: null };
  if (/^(floor-crit|income-crit|event|crit):/.test(target)) {
    const [kind, name] = target.split(/:(.*)/);
    if (kind === "floor-crit" || kind === "income-crit") return toRun(name);
    if (kind === "event") return toRun(`${camel(name)}Event`);
    return { run: target, dir: null };
  }
  if (fs.existsSync(path.join(FLOOR_CRITS, target)))
    return { run: `floor-crit:${target}`, dir: path.join(FLOOR_CRITS, target) };
  if (fs.existsSync(path.join(INCOME_CRITS, target)))
    return {
      run: `income-crit:${target}`,
      dir: path.join(INCOME_CRITS, target),
    };
  const event = target.endsWith("Event") ? target : `${camel(target)}Event`;
  if (fs.existsSync(path.join(EVENTS, event)))
    return {
      run: `event:${kebab(event.slice(0, -5))}`,
      dir: path.join(EVENTS, event),
    };
  return { run: `crit:${target}`, dir: null };
}

// floor crits and events with changed or new files, and badge crits added to
// the catalog, against the last commit
function changedTargets() {
  const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8" });
  const files = git(
    `status --porcelain=v1 -uall -- ${FLOOR_CRITS} ${INCOME_CRITS} ${EVENTS} ${CRIT_DATA}`,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ state: line.slice(0, 2), file: line.slice(3).trim() }));
  const targets = new Set();
  for (const { state, file } of files) {
    const floor = file.match(/(?:floor|income)Crits\/crits\/(\w+)\//);
    if (floor) targets.add(floor[1]);
    const event = file.match(/animatedCrits\/events\/(\w+Event)\//);
    if (event) targets.add(event[1]);
    if (!file.startsWith(CRIT_DATA) || file.endsWith("kinds.ts")) continue;
    const added = state.includes("?")
      ? fs.readFileSync(file, "utf8")
      : git(`diff -U0 HEAD -- ${file}`)
          .split("\n")
          .filter((line) => line.startsWith("+"))
          .join("\n");
    for (const match of added.matchAll(/^\+?\s{2}(\w+): \{/gm))
      targets.add(match[1]);
  }
  return [...targets];
}

function findBrowser() {
  const candidates = [process.env.CRIT_PERF_BROWSER];
  const playwright = path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".cache"),
    "ms-playwright",
  );
  if (fs.existsSync(playwright))
    for (const dir of fs
      .readdirSync(playwright)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .reverse())
      candidates.push(path.join(playwright, dir, "chrome-win64", "chrome.exe"));
  candidates.push(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((file) => file && fs.existsSync(file));
  if (!found) throw new Error("no Chrome/Edge found: set CRIT_PERF_BROWSER");
  return found;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// a minimal DevTools protocol client over the page's websocket
async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) for (const listen of listeners) listen(message);
  };
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      }),
    on: (listen) => listeners.push(listen),
    close: () => socket.close(),
  };
}

async function launch() {
  const profile = path.join(OUT, "browser");
  fs.mkdirSync(profile, { recursive: true });
  const portFile = path.join(profile, "DevToolsActivePort");
  fs.rmSync(portFile, { force: true });
  const browser = spawn(
    findBrowser(),
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--window-size=480,1000",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const page = targets.find((t) => t.type === "page");
  return { browser, cdp: await connect(page.webSocketDebuggerUrl) };
}

async function measure(runs) {
  const { browser, cdp } = await launch();
  const errors = [];
  cdp.on((message) => {
    if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      );
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  if (!desktop)
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 430,
      height: 932,
      deviceScaleFactor: 3,
      mobile: true,
    });
  const query = `run=${runs.map((r) => `${r}@${mode}`).join(",")}${counts ? "" : "&counts=0"}&stamp=${Date.now()}`;
  await cdp.send("Page.navigate", { url: `${url}?${query}` });
  const deadline = Date.now() + 90_000 + runs.length * 60_000;
  let results = null;
  while (Date.now() < deadline) {
    await sleep(1000);
    try {
      const { result } = await cdp.send("Runtime.evaluate", {
        expression:
          "document.body?.dataset.perfDone === '1' && window.perfRig?.done ? JSON.stringify(window.perfRig.results) : ''",
        returnByValue: true,
      });
      if (result.value) {
        results = JSON.parse(result.value);
        break;
      }
    } catch {
      // the rig reloads between runs
    }
  }
  if (!keep) {
    cdp.close();
    browser.kill();
  }
  if (!results)
    throw new Error(
      `the rig didn't finish within the time (${errors.length} page errors)`,
    );
  return { results, errors };
}

const fixed = (n, digits = 1) => Number(n ?? 0).toFixed(digits);

function overBudget(s) {
  const over = [];
  if (s.frame.p95 > BUDGET.frameP95)
    over.push(`frame p95 ${fixed(s.frame.p95)}ms`);
  if (s.redraw.p95 > BUDGET.redrawP95)
    over.push(`redraw p95 ${fixed(s.redraw.p95)}ms`);
  if (s.hitches > BUDGET.hitches) over.push(`${s.hitches} hitches`);
  if (s.longTasks > BUDGET.longTasks)
    over.push(`${s.longTasks} long tasks (${fixed(s.longTaskMs, 0)}ms)`);
  if (s.canvases > BUDGET.canvases) over.push(`${s.canvases} canvases made`);
  if (s.gcs > BUDGET.gcs) over.push(`${s.gcs} GCs (${fixed(s.gcMb)}MB)`);
  return over;
}

const relative = (file) => file.replaceAll("\\", "/").replace(/^src\//, "");

function report(targets, results, errors) {
  const lines = [];
  const result = (run) => results.find((s) => s.name === `${run}@${mode}`);
  const reference = ref ? result(`warm:${toRun(ref).run}`) : null;
  lines.push(
    `crit perf: ${throttle}x CPU, ${desktop ? "desktop" : "phone 430x932 @3x"}${reference ? `, against ${reference.name}` : ""}`,
    "cold: its first play after a page load (chunk loads, sprites baked); warm: played again",
  );
  if (errors.length)
    lines.push(
      `\n${errors.length} page errors:`,
      ...errors.slice(0, 5).map((e) => `  ${e.split("\n")[0]}`),
    );
  const ratio = (now, before) =>
    reference && before ? ` (${fixed(now / before, 2)}x ref)` : "";
  const totalCalls = (s) =>
    Object.values(s?.calls ?? {}).reduce((sum, n) => sum + n, 0);
  const describe = (label, s) => {
    const calls = totalCalls(s);
    const over = overBudget(s);
    const sources = (s.canvasSources ?? [])
      .slice(0, 3)
      .map(([at, n]) => `${n}x ${at}`)
      .join("; ");
    return [
      `${label}: fps ${fixed(s.fps, 0)} · frame p95 ${fixed(s.frame.p95)} max ${fixed(s.frame.max, 0)}ms · redraw avg ${fixed(s.redraw.avg, 2)}${label === "warm" ? ratio(s.redraw.avg, reference?.redraw.avg) : ""} p95 ${fixed(s.redraw.p95, 2)} max ${fixed(s.redraw.max, 1)}ms`,
      `  ${calls ? `canvas calls/frame ${fixed(calls, 0)}${label === "warm" ? ratio(calls, totalCalls(reference)) : ""} (drawImage ${fixed(s.calls?.drawImage, 0)}) · ` : ""}canvases made ${s.canvases} · GC ${s.gcs}/${fixed(s.gcMb)}MB · long tasks ${s.longTasks}`,
      over.length ? `  OVER BUDGET: ${over.join(", ")}` : "  within budget",
      ...(sources ? [`  canvases made by: ${sources}`] : []),
    ];
  };
  for (const target of targets) {
    const cold = result(target.run);
    const warm = result(`warm:${target.run}`);
    lines.push("", `== ${target.run}${cold || warm ? "" : " (no result)"}`);
    if (cold) lines.push(...describe("cold", cold));
    if (!warm) continue;
    lines.push(...describe("warm", warm));
    // where the warm run's time went, its own code marked
    const own = target.dir ? relative(target.dir) : null;
    const hot = (warm.profile?.self ?? []).filter(
      ([fn]) => !fn.includes(" perf/"),
    );
    if (hot.length) {
      lines.push(
        `own time by function, warm (${warm.profile.samples} samples, every ${fixed(warm.profile.sampleMs, 0)}ms; * = this crit's code):`,
      );
      for (const [fn, ms] of hot.slice(0, 10))
        lines.push(
          `  ${own && fn.includes(own) ? "*" : " "} ${fixed(ms, 0).padStart(5)}ms ${fn}`,
        );
    } else
      lines.push(
        "(no profile: serve the page with Document-Policy: js-profiling)",
      );
    if (!target.dir) continue;
    const hotNames = new Set(
      [...hot, ...(warm.profile?.total ?? [])]
        .filter(([fn]) => own && fn.includes(own))
        .map(([fn]) => fn.split(" < ").at(-1).split(" ")[0]),
    );
    const findings = audit([target.dir]);
    lines.push(
      findings.length
        ? `code (${findings.length}; HOT = in the profile):`
        : "code: nothing costly found",
    );
    for (const f of findings)
      lines.push(
        `  ${formatFinding(f, hotNames.has(f.fn)).replaceAll("\n", "\n  ")}`,
      );
  }
  return lines.join("\n");
}

const names = args.filter((a) => !a.startsWith("--"));
const targets = (names.length ? names : changedTargets()).map(toRun);
if (targets.length === 0) {
  console.log("no changed crits: name the crits to measure");
  process.exit(1);
}
const runs = [
  ...new Set([
    ...targets.flatMap((t) =>
      warmOnly ? [`warm:${t.run}`] : [t.run, `warm:${t.run}`],
    ),
    ...(ref ? [`warm:${toRun(ref).run}`] : []),
  ]),
];
try {
  await fetch(url);
} catch {
  console.log(
    `nothing serving ${url}: start the dev server (npx vite) or pass --url`,
  );
  process.exit(1);
}
console.log(`measuring ${runs.join(", ")} at ${throttle}x...`);
const { results, errors } = await measure(runs);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "last.json"),
  JSON.stringify({ throttle, results, errors }, null, 2),
);
if (json) console.log(JSON.stringify({ throttle, results, errors }, null, 2));
else console.log(report(targets, results, errors));
