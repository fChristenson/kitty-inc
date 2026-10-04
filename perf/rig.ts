// Entry of the perf rig. Boots the real game on an in-memory save fixture and
// runs scenarios one page load each (so none inherits another's caches,
// particles or timers), collecting a summary per scenario.
//
// ?run=idle,hold,events      runs those at once, then shows the report
// ?floors=10                 unlocked floors in the fixture building
// ?light=1                   no boosted workers, perma tiers or managers
// ?maxed=1                   every cat and manager at the top perma tier (a
//                            disco on every floor), high levels, overspeed bars
// ?counts=0                  don't count canvas calls (lowest overhead timing)
// ?warmup=2500               ms between boot and a scenario's own setup
// ?reseed=1                  rebuild the fixture from a fresh game first
//
// window.perfRig drives it from a console or Playwright: queue(names),
// run(name) on the current page, results, done.
import { clearBase, hasBase, loadFixture, seedBase } from "./storage";
import { instrument, start, stop, timeRedraw, type Summary } from "./metrics";
import { loadResults, mountPanel, saveResults } from "./report";

const QUEUE_KEY = "perf-rig:queue";
const RESULTS_KEY = "perf-rig:results";
const AUTORUN_KEY = "perf-rig:autorun";
const STARTUP_MS = 10_000;

const params = new URLSearchParams(location.search);
const options = {
  floors: Number(params.get("floors") ?? 10),
  heavy: params.get("light") !== "1",
  maxed: params.get("maxed") === "1",
  counts: params.get("counts") !== "0",
  warmup: Number(params.get("warmup") ?? 2500),
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const readQueue = (): string[] =>
  JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "[]") as string[];
const readSession = (): Summary[] =>
  JSON.parse(sessionStorage.getItem(RESULTS_KEY) ?? "[]") as Summary[];

interface PerfRig {
  queue: (names: string[]) => void;
  run: (name: string) => Promise<Summary>;
  results: Summary[];
  done: boolean;
}
const rig: PerfRig = {
  queue: () => {},
  run: () => Promise.reject(new Error("the game is still booting")),
  results: [],
  done: false,
};
(window as unknown as { perfRig: PerfRig }).perfRig = rig;

instrument(options.counts);

if (params.get("reseed") === "1") clearBase();
if (!hasBase()) {
  document.title = "Perf rig: seeding…";
  await import("../src/main.ts");
  await seedBase();
  params.delete("reseed");
  location.replace(`${location.pathname}?${params}`);
} else {
  await boot();
}

async function boot(): Promise<void> {
  const autorun = params.get("run");
  if (autorun && sessionStorage.getItem(AUTORUN_KEY) !== autorun) {
    sessionStorage.setItem(AUTORUN_KEY, autorun);
    sessionStorage.setItem(RESULTS_KEY, "[]");
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(autorun.split(",")));
  }
  let queue = readQueue();
  const current = queue[0];
  document.body.classList.toggle("running", Boolean(current));
  if (current === "startup") start();

  loadFixture(options);
  await import("../src/main.ts");
  const { whenPerfBridge } = await import("../src/shared/perfBridge");
  const bridge = await whenPerfBridge();
  bridge.wrapRedraw(timeRedraw);
  const { SCENARIOS, SAMPLE_EVENTS, eventIds, eventScenario } =
    await import("./scenarios");

  const find = (name: string) =>
    SCENARIOS.find((s) => s.name === name) ??
    (name.startsWith("event:") ? eventScenario(name.slice(6)) : null);
  // "events" and "events-all" stand for a sample of events, or every one
  const expand = (names: string[]) =>
    names.flatMap((name) => {
      const known = new Set(eventIds());
      if (name === "events")
        return SAMPLE_EVENTS.filter((id) => known.has(id)).map(
          (id) => `event:${id}`,
        );
      if (name === "events-all") return [...known].map((id) => `event:${id}`);
      return [name];
    });

  rig.queue = (names) => {
    sessionStorage.setItem(RESULTS_KEY, "[]");
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(expand(names)));
    location.reload();
  };
  rig.run = async (name) => {
    const scenario = find(name);
    if (!scenario) throw new Error(`no scenario ${name}`);
    return scenario.run(bridge);
  };

  if (current) {
    // a queue entry from before expand() existed
    if (current === "events" || current === "events-all") {
      queue = [...expand([current]), ...queue.slice(1)];
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      location.reload();
      return;
    }
    let summary: Summary;
    if (current === "startup") {
      await sleep(STARTUP_MS);
      summary = stop("startup");
    } else {
      await sleep(options.warmup);
      const scenario = find(current);
      summary = scenario
        ? await scenario.run(bridge)
        : { ...stop(current), name: `${current} (unknown)` };
    }
    const results = [...readSession(), summary];
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    queue.shift();
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    if (queue.length > 0) {
      location.reload();
      return;
    }
    saveResults("last", results);
    sessionStorage.removeItem(RESULTS_KEY);
    document.body.classList.remove("running");
  }

  rig.results = loadResults("last");
  const panel = mountPanel({
    scenarios: [
      { name: "startup", about: "the first 10s after the page loads" },
      ...SCENARIOS,
      { name: "events", about: "a sample of events across the templates" },
      { name: "events-all", about: "every event with a test button (slow)" },
    ],
    onRun: rig.queue,
    onReseed: () => {
      clearBase();
      location.reload();
    },
    environment: `${innerWidth}×${innerHeight} @${devicePixelRatio}x · ${options.floors} floors${options.heavy ? ", heavy" : ""}${options.maxed ? ", maxed" : ""} · counts ${options.counts ? "on" : "off"} · throttle the CPU in DevTools for phone-like numbers`,
  });
  panel.showResults(rig.results);
  rig.done = true;
  document.body.dataset.perfDone = "1";
}
