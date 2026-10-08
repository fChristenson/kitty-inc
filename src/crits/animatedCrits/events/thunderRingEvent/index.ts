// the "Thunder Ring" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while a ring of crackling bolts flares up
// round the clicked floor's button and blasts outward in jolting surges,
// each a crack and a shake; wherever the ring sweeps over an empty spot a
// bolt strikes it in a blinding flash and a new worker forms; the last
// spot it crosses goes off in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "thunderRing";
const MAX_HIRES = 6;
const SEGMENTS = 10;
const START = 50;
const PAD = 60;
const STRIKE_MS = 160;
const FORM_MS = 300;
const SURGE_SHAKE: [number, number] = [0.4, 0.9];
const HIT_SHAKE: [number, number] = [0.5, 1.1];

export const forceThunderRingEvent = registerWispEvent(
  KEY,
  "Thunder Ring",
  () => CONFIG.thunderRingEvent.chance,
  (floor, context) => {
    const { surges, surgeMs, gapMs, holdMs, mergeMs } = CONFIG.thunderRingEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const reach =
      Math.max(
        ...hires.map((h) => Math.hypot(h.x - button.x, h.y - button.y)),
      ) + PAD;
    // surges each a jolt outward, quicker each time
    let clock = 0;
    const steps = Array.from({ length: surges }, (_, k) => {
      const starts = clock;
      clock += surgeMs + lerp(gapMs, k / Math.max(1, surges - 1));
      return {
        starts,
        from: lerp([START, reach], k / surges),
        to: lerp([START, reach], (k + 1) / surges),
      };
    });
    const radiusAt = (ms: number) => {
      let r = START;
      for (const s of steps)
        if (ms >= s.starts)
          r = lerp([s.from, s.to], easeOut(clamp01((ms - s.starts) / surgeMs)));
      return r;
    };
    const fadesAt = steps[surges - 1].starts + surgeMs;
    // when the ring sweeps over each spot, found once by stepping through
    const strikes = hires
      .map((hire) => {
        const d = Math.hypot(hire.x - button.x, hire.y - button.y);
        let ms = 0;
        while (ms < fadesAt && radiusAt(ms) < d) ms += 5;
        return { hire, at: { x: hire.x, y: hire.y } as Point, ms };
      })
      .sort((a, b) => a.ms - b.ms);
    const last = strikes[strikes.length - 1];
    const endAt = Math.max(fadesAt, last.ms + STRIKE_MS);
    const points: Point[] = Array.from({ length: SEGMENTS }, (_, i) => {
      const a = (i / SEGMENTS) * Math.PI * 2;
      return {
        x: button.x + Math.cos(a) * reach,
        y: button.y + Math.sin(a) * reach,
      };
    });
    // no forks: they're sized at creation, and the ring keeps growing
    const bolts = points.map((p, i) =>
      createBolt(p, points[(i + 1) % SEGMENTS], 0),
    );

    const surging = createBeats(
      steps,
      (s) => s.starts,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, k / Math.max(1, surges - 1)));
      },
    );
    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, strikes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          surging.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt) return;
          const r = radiusAt(ms);
          const spin = ms * 0.0006;
          for (let i = 0; i < SEGMENTS; i++) {
            const a = (i / SEGMENTS) * Math.PI * 2 + spin;
            points[i].x = button.x + Math.cos(a) * r;
            points[i].y = button.y + Math.sin(a) * r;
          }
          const fade = 1 - clamp01((ms - fadesAt) / STRIKE_MS);
          if (fade > 0)
            for (const bolt of bolts)
              drawBolt(ctx, bolt, fade * (0.6 + 0.4 * Math.random()), 0.7);
          for (const s of strikes) {
            const t = (ms - s.ms) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, s.at, 1 - t, 1.2, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
