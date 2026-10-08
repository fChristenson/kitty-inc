// the "Bolt Barrage" event (lightning; cash): it covers its crit, whose
// click freezes the screen while lightning opens up on the whole screen,
// short bolts flickering down out of the sky all over it, each a blinding
// crack and a burst of coins, slow at first, then faster and faster into a
// crackling barrage, until one monster bolt splits the sky down the middle
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "boltBarrage";
const REWARD = 4;
const STRIKES = 26;
const EDGE = 70;
const TOP = 160;
const LENGTH: [number, number] = [120, 260];
const BOLT_MS = 110;
const COINS = 10;
const COIN_REACH: [number, number] = [20, 90];
const BANG_GAP_MS = 60;

export const forceBoltBarrageEvent = registerWispEvent(
  KEY,
  "Bolt Barrage",
  () => CONFIG.boltBarrageEvent.chance,
  (floor, context, area) => {
    const { barrageMs, holdMs, mergeMs } = CONFIG.boltBarrageEvent;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const strikes = Array.from({ length: STRIKES }, (_, i) => {
      const hit: Point = {
        x: lerp([left, right], Math.random()),
        y: lerp([top + 120, bottom], Math.random()),
      };
      const length = lerp(LENGTH, Math.random());
      const from: Point = {
        x: hit.x + (Math.random() - 0.5) * length * 0.6,
        y: Math.max(top, hit.y - length),
      };
      // spaced ever closer, so the barrage builds
      return {
        hit,
        ms: barrageMs * Math.sqrt(i / STRIKES),
        bolt: createBolt(from, hit, 1),
        final: false,
      };
    });
    const middle: Point = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const endAt = barrageMs + BOLT_MS;
    strikes.push({
      hit: middle,
      ms: endAt,
      bolt: createBolt({ x: middle.x, y: area.top + 40 }, middle, 4),
      final: true,
    });
    let lastBang = -Infinity;

    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        cover!.launchFrom(
          s.hit,
          ringTargets(s.hit, s.final ? COINS * 5 : COINS, COIN_REACH),
        );
        if (s.final) {
          cover!.blast(s.hit);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(s.hit, 0.3);
        if (!cover!.isLive() || s.ms - lastBang < BANG_GAP_MS) return;
        lastBang = s.ms;
        playBloop();
        shakeScreen(lerp([0.3, 1], k / STRIKES));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS * 2) return;
          for (const s of strikes) {
            const span = s.final ? BOLT_MS * 2 : BOLT_MS;
            const t = (ms - s.ms) / span;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, s.final ? 2.2 : 0.8);
            drawStrike(ctx, s.hit, 1 - t, s.final ? 2.4 : 0.8, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
