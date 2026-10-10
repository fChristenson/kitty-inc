// Entry of the perf rig. Boots the real game on an in-memory save fixture and
// runs scenarios one page load each (so none inherits another's caches,
// particles or timers), collecting a summary per scenario.
//
// Cold starts (startup, cold-*) only mean something on a build: the dev
// server loads hundreds of unbundled modules for seconds after boot. Run
// `npm run perf:build`, then `npx vite preview --mode perf` and open
// /kitty-inc/perf/index.html there (its own origin, so it seeds its own save).
//
// ?run=idle,hold,events      runs those at once, then shows the report
//                            ("late" runs the big-company set; pair with ?late=1)
// ?floors=10                 unlocked floors in each fixture building
// ?buildings=1               buildings in the company (the last on screen)
// ?companies=1               companies, each a copy of the first
// ?late=1                    a late-game save: 30 full buildings in each of
//                            6 companies, maxed (the others still override)
// ?light=1                   no boosted workers, perma tiers or managers
// ?maxed=1                   every cat and manager at the top perma tier,
//                            high levels, overspeed bars
// ?level=1000                every floor at that level
// ?counts=0                  don't count canvas calls (lowest overhead timing)
// ?warmup=2500               ms between boot and a scenario's own setup
// ?reseed=1                  rebuild the fixture from a fresh game first
// ?crits=on|tiers|off        crit odds for runs without their own @mode
// ?seed=1                    the crit dice's seed, so a run lands the same
//                            crits every time; 0 rolls freely
//
// A run name can carry its crit mode: hold@off (no crits), hold@tiers (crit
// tiers, no procs or events), hold@on.
//
// One crit start to finish: floor-crit:<kind>, event:<id> or crit:<kind> (a
// proc or badge crit at the top tier); warm:<run> plays it once unmeasured
// first. `node scripts/crit-perf.mjs` runs new crits both ways, throttled, and
// reports what they cost and where.
//
// scale:<buildings>[x<companies>] runs the same idle, long-press and map on a
// fixture of that size, whatever the URL says ("scale" runs 1, 50 and 100
// buildings; "scale-companies" the same with 10 companies).
// money:<exponent> runs it with every amount that many powers of ten bigger
// ("money" runs 0, 100, 1000 and 1000000), affording just the same.
//
// window.perfRig drives it from a console or Playwright: queue(names),
// run(name) on the current page, results, done.
import { clearBase, hasBase, loadFixture, seedBase } from "./storage";
import { instrument, start, stop, timeRedraw, type Summary } from "./metrics";
import { loadResults, mountPanel, saveResults } from "./report";
import type { Scenario } from "./scenarios";

const QUEUE_KEY = "perf-rig:queue";
const RESULTS_KEY = "perf-rig:results";
const AUTORUN_KEY = "perf-rig:autorun";
const STARTUP_MS = 10_000;

const params = new URLSearchParams(location.search);
const late = params.get("late") === "1";
const options = {
  floors: Number(params.get("floors") ?? (late ? 20 : 10)),
  buildings: Number(params.get("buildings") ?? (late ? 30 : 1)),
  companies: Number(params.get("companies") ?? (late ? 6 : 1)),
  heavy: params.get("light") !== "1",
  maxed: params.has("maxed") ? params.get("maxed") === "1" : late,
  level: params.has("level") ? Number(params.get("level")) : null,
  counts: params.get("counts") !== "0",
  warmup: Number(params.get("warmup") ?? 2500),
  crits: params.get("crits") ?? "on",
  seed: Number(params.get("seed") ?? 1),
  money: Number(params.get("money") ?? 0),
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const SCALE_BUILDINGS = [1, 50, 100];
const SCALE_COMPANIES = 10;
const MONEY_EXPONENTS = [0, 100, 1000, 1_000_000];

// a scale or money run's own fixture options, from its name (any @mode ignored)
function fixtureOf(
  name: string,
): { buildings?: number; companies?: number; money?: number } | null {
  const scale = /^scale:(\d+)(?:x(\d+))?(?:@|$)/.exec(name);
  if (scale)
    return { buildings: Number(scale[1]), companies: Number(scale[2] ?? 1) };
  const money = /^money:(\d+)(?:@|$)/.exec(name);
  return money ? { money: Number(money[1]) } : null;
}

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
  await import("../src/boot");
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

  loadFixture({ ...options, ...fixtureOf(current ?? "") });
  await import("../src/boot");
  const { whenPerfBridge } = await import("../src/shared/perfBridge");
  const bridge = await whenPerfBridge();
  bridge.wrapRedraw(timeRedraw);
  const {
    SCENARIOS,
    SAMPLE_EVENTS,
    LATE_SCENARIOS,
    CRIT_MODES,
    eventIds,
    eventScenario,
    floorCritKinds,
    floorCritScenario,
    critScenario,
    spawnScenario,
    warmScenario,
    parseRunName,
    prepareRun,
    scaleScenario,
  } = await import("./scenarios");
  const defaultMode =
    options.crits in CRIT_MODES
      ? (options.crits as keyof typeof CRIT_MODES)
      : "on";

  const find = (name: string): Scenario | null => {
    if (name.startsWith("warm:")) {
      const inner = find(name.slice(5));
      return inner && warmScenario(inner);
    }
    return (
      SCENARIOS.find((s) => s.name === name) ??
      (name.startsWith("event:")
        ? eventScenario(name.slice(6))
        : name.startsWith("floor-crit:")
          ? floorCritScenario(name.slice(11))
          : name.startsWith("income-crit:")
            ? floorCritScenario(name.slice(12), "income")
            : name.startsWith("crit:")
              ? critScenario(name.slice(5))
              : name.startsWith("spawn:")
                ? spawnScenario(name.slice(6))
                : name.startsWith("spawn-idle:")
                  ? spawnScenario(name.slice(11), false)
                  : fixtureOf(name)
                    ? scaleScenario(name)
                    : null)
    );
  };
  // "events" and "events-all" stand for a sample of events, or every one,
  // keeping any @mode
  const expand = (names: string[]) =>
    names.flatMap((name) => {
      const known = new Set(eventIds());
      const { base, mode } = parseRunName(name);
      const suffix = mode ? `@${mode}` : "";
      if (base === "events")
        return SAMPLE_EVENTS.filter((id) => known.has(id)).map(
          (id) => `event:${id}${suffix}`,
        );
      if (base === "events-all")
        return [...known].map((id) => `event:${id}${suffix}`);
      if (base === "floor-crits")
        return floorCritKinds().map((kind) => `floor-crit:${kind}${suffix}`);
      if (base === "late")
        return LATE_SCENARIOS.map((id) =>
          id === "startup" ? id : `${id}${suffix}`,
        );
      if (base === "scale" || base === "scale-companies")
        return SCALE_BUILDINGS.map(
          (buildings) =>
            `scale:${buildings}${base === "scale" ? "" : `x${SCALE_COMPANIES}`}${suffix}`,
        );
      if (base === "money")
        return MONEY_EXPONENTS.map((exponent) => `money:${exponent}${suffix}`);
      return [name];
    });
  // a run under its crit mode and freshly seeded dice, named as asked
  const runNamed = async (name: string): Promise<Summary | null> => {
    const { base, mode } = parseRunName(name);
    const scenario = find(base);
    if (!scenario) return null;
    prepareRun(mode ?? defaultMode, options.seed);
    return { ...(await scenario.run(bridge)), name };
  };

  rig.queue = (names) => {
    sessionStorage.setItem(RESULTS_KEY, "[]");
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(expand(names)));
    location.reload();
  };
  rig.run = async (name) => {
    const summary = await runNamed(name);
    if (!summary) throw new Error(`no scenario ${name}`);
    return summary;
  };

  if (current) {
    // a set queued before expand() could run (a ?run= autorun)
    const expanded = expand([current]);
    if (expanded.length !== 1 || expanded[0] !== current) {
      queue = [...expanded, ...queue.slice(1)];
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      location.reload();
      return;
    }
    let summary: Summary;
    if (current === "startup") {
      await sleep(STARTUP_MS);
      summary = await stop("startup");
    } else {
      if (!find(parseRunName(current).base)?.cold) await sleep(options.warmup);
      summary = (await runNamed(current)) ?? {
        ...(await stop(current)),
        name: `${current} (unknown)`,
      };
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
      { name: "floor-crits", about: "every floor crit, one run each" },
      {
        name: "late",
        about: "what grows with the company; open with ?late=1 for a big save",
      },
      {
        name: "scale",
        about: `idle, a long-press and the map with ${SCALE_BUILDINGS.join(", ")} buildings: should run alike`,
      },
      {
        name: "scale-companies",
        about: `the same with ${SCALE_COMPANIES} companies of that many buildings each`,
      },
      {
        name: "money",
        about: `the same with every amount 1e${MONEY_EXPONENTS.join(", 1e")} times bigger: should run alike`,
      },
    ],
    onRun: rig.queue,
    critModes: CRIT_MODES,
    onReseed: () => {
      clearBase();
      location.reload();
    },
    environment: `${innerWidth}×${innerHeight} @${devicePixelRatio}x · ${options.companies > 1 ? `${options.companies} companies × ` : ""}${options.buildings > 1 ? `${options.buildings} buildings × ` : ""}${options.floors} floors${options.heavy ? ", heavy" : ""}${options.maxed ? ", maxed" : ""} · counts ${options.counts ? "on" : "off"} · crit seed ${options.seed || "free"} · throttle the CPU in DevTools for phone-like numbers`,
  });
  panel.showResults(rig.results);
  rig.done = true;
  document.body.dataset.perfDone = "1";
}
