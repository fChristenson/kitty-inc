// the dev and perf builds' test panel: its markup, every button's wiring and
// the perf rig's bridge. main.ts imports it only outside production, so the
// shipped game never loads it. Every event's button comes from its meta.ts
// card and forces it by name ("rule-30" -> forceRule30Event)
import {
  forceTestCrit,
  forceCashCrit,
  forceFloorCrit,
  forceIncomeCrit,
  forceButtonCrit,
  forceLockCrit,
  forceRateCrit,
  loadBadgeCatalog,
  loadEventCards,
  loadEventCatalog,
  type CritTier,
  type EventCatalog,
} from "../crits";
import {
  createTestButtonMarkup,
  wireCritTestActions,
  wireTestButton,
  wireSpawnTestButtons,
  wireTestActionsFilter,
  sortTestActionMenus,
  wireIdleOverlayTestButton,
  wireSplashTestButton,
  wireAddBadgesTestButtons,
  wireFoilRevealTestButtons,
  wireEventTestButtons,
  wireBadgeCapsuleTestButton,
  wireFloorCritTestButtons,
  wireIncomeCritTestButtons,
  wireButtonCritTestButtons,
  wireLockCritTestButtons,
  wireRateCritTestButtons,
  wireResetButton,
} from "../hud";
import type { createGameCanvas } from "../background";
import { forceGoldSwitch } from "../floors";
import type { Floor } from "../gameState";
import { SPAWN_CARDS, forceSpawn } from "../spawn";
import { addTotalIncome } from "../totalIncome";
import { fromNumber } from "../shared/bigNumber";
import { runWhenIdle } from "../shared/idle";
import { exposePerfBridge } from "../shared/perfBridge";

export interface DevTestDeps {
  app: HTMLElement;
  // every building of the active company (the array main.ts refills on a switch)
  buildings: Floor[][];
  activeFloors: () => Floor[];
  activeCompany: () => number;
  gameCanvas: ReturnType<typeof createGameCanvas>;
  goToBuilding: (index: number) => Promise<void>;
  switchCompany: (index: number) => Promise<void>;
  showIdleOverlay: () => void;
  showSplash: () => void;
}

// a tier picked beside a button, or undefined for "random"
const pickedTier = (pick: string | undefined): CritTier | undefined =>
  pick === undefined || pick === "random" ? undefined : (pick as CritTier);

// the event catalog's force hook for a button's key
const forceName = (key: string): string =>
  `force${key.replace(/(?:^|-)(\w)/g, (_, c: string) => c.toUpperCase())}Event`;

export async function wireDevTests(deps: DevTestDeps): Promise<void> {
  const { app, gameCanvas } = deps;
  const [events] = await Promise.all([loadEventCards(), loadBadgeCatalog()]);
  app
    .querySelector(".game")!
    .insertAdjacentHTML(
      "beforeend",
      createTestButtonMarkup(events, SPAWN_CARDS),
    );
  exposePerfBridge({
    getActiveFloors: deps.activeFloors,
    floorToClient: gameCanvas.floorToClient,
    scrollToFloor: gameCanvas.scrollActiveToFloor,
    wrapRedraw: (wrap) => {
      gameCanvas.redraw = wrap(gameCanvas.redraw);
    },
    buildingCount: () => deps.buildings.length,
    goToBuilding: deps.goToBuilding,
    activeCompany: deps.activeCompany,
    switchCompany: deps.switchCompany,
  });
  const ground = (): Floor | undefined => deps.activeFloors()[0];
  // the floor right under the locked one
  const underLocked = (): Floor | undefined => {
    const floors = deps.activeFloors();
    return floors[floors.findIndex((f) => !f.unlocked) - 1];
  };
  const scrollTo = (floor: Floor | null | undefined): floor is Floor => {
    if (floor) gameCanvas.scrollActiveToFloor(floor);
    return !!floor;
  };

  // absurdly large: covers buying dozens of buildings, many cities deep
  wireTestButton(app, () => addTotalIncome(fromNumber(1e150)));
  wireSpawnTestButtons(app, (key) => void forceSpawn(key));
  wireCritTestActions(
    app,
    (kind, tier, event) => {
      const floor = ground();
      if (floor) forceTestCrit(floor, kind, tier, event);
    },
    (tier) => {
      const floor = ground();
      if (floor) forceCashCrit(floor, tier);
    },
  );
  wireIdleOverlayTestButton(app, deps.showIdleOverlay);
  wireSplashTestButton(app, deps.showSplash);
  wireAddBadgesTestButtons(app);
  wireFoilRevealTestButtons(app, (kind) => {
    const floor = ground();
    if (floor) forceTestCrit(floor, kind, "crit", "upgrade");
  });
  wireFloorCritTestButtons(app, (kind) => {
    const floor = ground();
    if (floor) forceFloorCrit(floor, kind);
  });
  wireIncomeCritTestButtons(app, (kind) => {
    const floor = ground();
    if (floor) forceIncomeCrit(floor, kind);
  });
  wireButtonCritTestButtons(app, (kind) => {
    const floor = ground();
    if (floor) forceButtonCrit(floor, kind);
  });
  // armed on the top open floor, just under the locked one it plays on
  wireLockCritTestButtons(app, (kind) => {
    let top = ground();
    for (const floor of deps.activeFloors()) if (floor.unlocked) top = floor;
    if (top) forceLockCrit(top, kind);
  });
  wireRateCritTestButtons(app, (kind) => {
    const floor = ground();
    if (floor) forceRateCrit(floor, kind);
  });
  wireBadgeCapsuleTestButton(app, () => {
    scrollTo(ground());
    gameCanvas.openBadgeCapsule(true);
  });

  // an event's button: forced on the ground floor, scrolled to; these few
  // play their own way
  async function playEvent(
    ev: EventCatalog,
    key: string,
    pick: string | undefined,
  ): Promise<void> {
    const floors = deps.activeFloors();
    const floor = ground();
    switch (key) {
      // on the lowest floor it can play on
      case "boost":
        scrollTo(ev.forceBoostEvent(floors));
        return;
      case "union":
        scrollTo(ev.forceUnionEvent(floors));
        return;
      // on the mouse's floor, putting one out if none is
      case "hunt": {
        let on = ev.forceHuntEvent();
        if (!on) {
          await forceSpawn("mouse");
          on = ev.forceHuntEvent();
        }
        scrollTo(on);
        return;
      }
      case "swarm":
        if (scrollTo(floor))
          ev.startSwarmEvent(floor, true, floors, gameCanvas.getFloorRect);
        return;
      // with the locked floor above in view
      case "beanstalk": {
        const on = underLocked() ?? floor;
        if (scrollTo(on)) ev.forceBeanstalkEvent(on);
        return;
      }
      case "unlock": {
        const on = underLocked();
        if (scrollTo(on))
          ev.forceUnlockEvent(on, pick === "none" ? null : pickedTier(pick));
        return;
      }
      case "draw":
        if (scrollTo(floor)) ev.forceDrawEvent(floor, pickedTier(pick));
        return;
      case "night-sky":
        if (scrollTo(floor)) ev.forceNightSkyEvent(floor, pickedTier(pick));
        return;
      case "pitcher":
        if (scrollTo(floor)) ev.forcePitcherEvent(floor, pickedTier(pick));
        return;
      // a floors test action, not an event
      case "gold-switch":
        if (scrollTo(floor)) forceGoldSwitch(floor);
        return;
    }
    const force = (
      ev as unknown as Record<string, ((on: Floor) => void) | undefined>
    )[forceName(key)];
    if (!force) throw new Error(`no ${forceName(key)} for #test-${key}-event`);
    if (scrollTo(floor)) force(floor);
  }
  // the events load in their own chunks: fetched ahead, so a button needn't wait
  runWhenIdle(() => void loadEventCatalog());
  wireEventTestButtons(
    app,
    [...events.map((event) => event.key), "gold-switch"],
    (key, pick) =>
      void loadEventCatalog().then((ev) => playEvent(ev, key, pick)),
  );

  wireResetButton(app, deps.buildings);
  // last, so they see every dropdown and button above
  sortTestActionMenus(app);
  wireTestActionsFilter(app);
}
