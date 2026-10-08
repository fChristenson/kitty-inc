// the "Hamster Wheel" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a ring of wisps forms a wheel in the middle of
// the screen and a runner wisp leaps inside it and starts to run; the wheel
// spins faster and faster, every rim wisp flinging coins off as it whips
// over the top with a tick and a jolt, until it's a blur; then the wheel
// bursts apart, every rim wisp flying off into the total, the last in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "hamsterWheel";
const REWARD = 4;
const RIM = 8;
const RADIUS = 130;
const FORM_MS = 300;
// the wheel turns TURNS times over the spin, quickening
const TURNS = 6;
const SPOKE = 0.32;
const RUNNER = 0.5;
const FLING_GAP_MS = 50;
const TICK_SHAKE: [number, number] = [0.2, 0.8];

export const forceHamsterWheelEvent = registerWispEvent(
  KEY,
  "Hamster Wheel",
  () => CONFIG.hamsterWheelEvent.chance,
  (floor, context, area) => {
    const { spinMs, flyMs, holdMs, mergeMs } = CONFIG.hamsterWheelEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const total = totalSpot(area);
    const spinsAt = FORM_MS;
    const burstAt = spinsAt + spinMs;
    const turnOf = (ms: number) =>
      TURNS * Math.PI * 2 * easeIn(clamp01((ms - spinsAt) / spinMs));
    // every time a rim wisp tops the wheel: k turns + its offset
    const tops: { ms: number; at: Point }[] = [];
    for (let i = 0; i < RIM; i++)
      for (let n = 0; n < TURNS; n++) {
        const angle =
          n * Math.PI * 2 +
          ((((-Math.PI / 2 - (i / RIM) * Math.PI * 2) % (Math.PI * 2)) +
            Math.PI * 2) %
            (Math.PI * 2));
        if (angle > TURNS * Math.PI * 2) continue;
        tops.push({
          ms: spinsAt + spinMs * Math.sqrt(angle / (TURNS * Math.PI * 2)),
          at: { x: hub.x, y: hub.y - RADIUS },
        });
      }
    tops.sort((a, b) => a.ms - b.ms);
    const flings = tops.filter(
      (t, k) => k === 0 || t.ms - tops[k - 1].ms >= FLING_GAP_MS,
    );
    const rim = Array.from({ length: RIM }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      const leaves = burstAt + i * 40;
      const arrives = leaves + flyMs;
      const release: Point = { x: 0, y: 0 };
      const angleAt = (ms: number) => (i / RIM) * Math.PI * 2 + turnOf(ms);
      release.x = hub.x + Math.cos(angleAt(burstAt)) * RADIUS;
      release.y = hub.y + Math.sin(angleAt(burstAt)) * RADIUS;
      return {
        arrives,
        at: (ms: number): Point => {
          if (ms < FORM_MS) {
            const u = easeOut(ms / FORM_MS);
            at.x = lerp([button.x, hub.x + Math.cos(angleAt(0)) * RADIUS], u);
            at.y = lerp([button.y, hub.y + Math.sin(angleAt(0)) * RADIUS], u);
            return at;
          }
          if (ms < leaves) {
            const a = angleAt(Math.min(ms, burstAt));
            at.x = hub.x + Math.cos(a) * RADIUS;
            at.y = hub.y + Math.sin(a) * RADIUS;
            return at;
          }
          const target = cover?.total() ?? total;
          const u = easeIn(clamp01((ms - leaves) / flyMs));
          at.x = lerp([release.x, target.x], u);
          at.y = lerp([release.y, target.y], u);
          return at;
        },
      };
    });
    const lastArrival = rim[RIM - 1].arrives;
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / FORM_MS));
      runnerAt.x = lerp([button.x, hub.x], u);
      runnerAt.y =
        lerp([button.y, hub.y + RADIUS - 30], u) -
        Math.abs(Math.sin(ms / 45)) * 8;
      return runnerAt;
    };

    const flinging = createBeats(
      flings,
      (f) => f.ms,
      (f, k) => {
        cover!.launchFrom(f.at, [
          {
            x: f.at.x + (Math.random() - 0.5) * 160,
            y: f.at.y - 60 - Math.random() * 60,
          },
          {
            x: f.at.x + (Math.random() - 0.5) * 160,
            y: f.at.y - 40 - Math.random() * 60,
          },
        ]);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(TICK_SHAKE, (f.ms - spinsAt) / spinMs));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.burst(hub, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.3);
      },
    );
    const arriving = createBeats(
      rim,
      (r) => r.arrives,
      (r) => {
        const at = cover!.total() ?? total;
        if (r === rim[RIM - 1]) cover!.blast(at);
        else cover!.burst(at, 0.3);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastArrival + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flinging.tick(ms, now);
          bursting.tick(ms, now);
          arriving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > lastArrival) return;
          for (const r of rim)
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * SPOKE,
              0.6,
              0,
              r.arrives,
            );
          drawWispBetween(
            ctx,
            runner,
            ms,
            now,
            WISP_SIZE * RUNNER,
            0.8,
            0,
            burstAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
