// the "Turbine" event (mix; free hires and cash): it covers its crit, whose
// click freezes the screen while a wisp leads a river of cash up out of the
// clicked floor's button into the middle of the screen, where it feeds a
// turbine: a ring of blade wisps springs out round it and spins up as the
// cash pours in, faster and faster, every lap a whoosh and a jolt; at full
// speed blades fly off its rim one after another and curve down onto the
// empty spots, each landing as a new worker, then the hub and the rest of
// the ring shoot up into the total-income readout in a huge blast. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "turbine";
const REWARD = 3;
const MAX_HIRES = 4;
const BLADES = 6;
// the hub's share of the way down the screen, the ring's radius, its laps
const HUB_Y = 0.4;
const RING = 150;
const LAPS = 4;
// px a released blade flies on along its rim before curving down, and how
// far over each spot it lands
const FLING = 260;
const ABOVE = 40;
const RELEASE_GAP_MS = 70;
const HUB = WISP_SIZE * 1.3;
const BLADE = WISP_SIZE * 0.7;
const FEED_SHAKE = 0.7;
const LAP_SHAKE: [number, number] = [0.3, 0.9];
const HIRE_SHAKE = 1.2;

export const forceTurbineEvent = registerWispEvent(
  KEY,
  "Turbine",
  () => CONFIG.turbineEvent.chance,
  (floor, context, area) => {
    const { feedMs, spinMs, flyMs, riseMs, holdMs, mergeMs } =
      CONFIG.turbineEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], HUB_Y),
    };
    const line = sampleLine(
      (u) => bezier(button, { x: button.x, y: hub.y }, hub, u, { x: 0, y: 0 }),
      50,
    );
    const pour: Pour = {
      coinsAlong: 900,
      width: 26,
      streamMs: feedMs + spinMs,
      travelMs: feedMs,
    };
    const head = riverHead(line, feedMs);
    const spinsUntil = feedMs + spinMs;
    const turnAt = (ms: number) =>
      LAPS * Math.PI * 2 * easeIn(clamp01((ms - feedMs) / spinMs));
    const ringAt = (k: number, ms: number, into: Point): Point => {
      const a = turnAt(ms) + (k / BLADES) * Math.PI * 2;
      const r = RING * easeOut(clamp01((ms - feedMs) / 200));
      into.x = hub.x + Math.cos(a) * r;
      into.y = hub.y + Math.sin(a) * r;
      return into;
    };
    // the first blades fly off onto the spots; the hub and the rest rise
    // into the total after them
    const risesAt = spinsUntil + hires.length * RELEASE_GAP_MS + flyMs * 0.5;
    const inAt = risesAt + riseMs;
    const blades = Array.from({ length: BLADES }, (_, k) => {
      const hire = k < hires.length ? hires[k] : null;
      const leaves = hire ? spinsUntil + k * RELEASE_GAP_MS : risesAt;
      const lands = hire ? leaves + flyMs : inAt;
      const start = ringAt(k, leaves, { x: 0, y: 0 });
      // flung on along the rim, the way it was spinning
      const a = turnAt(leaves) + (k / BLADES) * Math.PI * 2 + Math.PI / 2;
      const fling: Point = {
        x: start.x + Math.cos(a) * FLING,
        y: start.y + Math.sin(a) * FLING,
      };
      const spot = { x: 0, y: 0 };
      const home: Point | null = hire ? { x: hire.x, y: hire.y - ABOVE } : null;
      return {
        hire,
        leaves,
        lands,
        home,
        at: (ms: number): Point | null => {
          if (ms > lands) return null;
          if (ms < leaves) return ringAt(k, Math.max(feedMs, ms), spot);
          const u = easeIn(clamp01((ms - leaves) / (lands - leaves)));
          if (home) return bezier(start, fling, home, u, spot);
          const total = cover?.total() ?? fallback;
          return bezier(start, { x: start.x, y: total.y }, total, u, spot);
        },
      };
    });
    const hubSpot = { x: 0, y: 0 };
    const hubAt = (ms: number): Point | null => {
      if (ms > inAt) return null;
      if (ms < risesAt) return hub;
      const total = cover?.total() ?? fallback;
      return bezier(
        hub,
        { x: hub.x, y: total.y },
        total,
        easeIn(clamp01((ms - risesAt) / riseMs)),
        hubSpot,
      );
    };
    const leadAt = (ms: number): Point | null =>
      ms >= feedMs ? null : head(Math.max(0, ms));
    const laps = Array.from(
      { length: LAPS },
      (_, l) => feedMs + spinMs * Math.sqrt((l + 1) / LAPS),
    );
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      inAt + holdMs + mergeMs,
    );

    const feeding = createBeats(
      [feedMs],
      (ms) => ms,
      () => {
        cover!.burst(hub, 0.7);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FEED_SHAKE);
      },
    );
    const lapping = createBeats(
      laps,
      (ms) => ms,
      (_, l) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(LAP_SHAKE, l / Math.max(1, LAPS - 1)));
      },
    );
    const landing = createBeats(
      blades.filter((b) => b.hire),
      (b) => b.lands,
      (b) => {
        giveHire(b.hire!);
        cover!.burst(b.home!, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIRE_SHAKE);
      },
    );
    const rising = createBeats(
      [risesAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          feeding.tick(ms, now);
          lapping.tick(ms, now);
          landing.tick(ms, now);
          rising.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > inAt + 600) return;
          drawWispBetween(ctx, leadAt, ms, now, BLADE, 0.8, 0, feedMs);
          drawWispBetween(
            ctx,
            hubAt,
            ms,
            now,
            HUB,
            clamp01((ms - feedMs) / spinMs),
            feedMs,
            inAt,
          );
          for (const b of blades)
            drawWispBetween(ctx, b.at, ms, now, BLADE, 0.9, feedMs, b.lands);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
