// the "Tennis" event (bounce; crit tiers): it covers its crit, whose click
// freezes the screen while two player wisps take the screen's left and
// right edges and rally a ball wisp across it, every shot bouncing once on
// an income bar on the far side, each bounce a splash and a jolt that jumps
// the bar a crit tier; the rally quickens shot by shot, the shots flatter
// and harder, until a smash lands on the last bar in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, hops } from "../../../../shared/bounce";
import { findRewardBars } from "../../eventRewards";

const KEY = "tennis";
const MAX_BARS = 4;
const SIDE = 50;
const LIFT: [number, number] = [110, 40];
const BALL = 0.35;
const PLAYER = 0.55;
const SPLASH = 100;
const HIT_SPLASH = 80;
const BOUNCE_SHAKE: [number, number] = [0.6, 1.3];

export const forceTennisEvent = registerWispEvent(
  KEY,
  "Tennis",
  () => CONFIG.tennisEvent.chance,
  (floor, context, area) => {
    const { serveMs, legMs, holdMs, mergeMs } = CONFIG.tennisEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const height = area.bottom - area.top;
    const xs = [area.left + SIDE, area.right - SIDE];
    // shot k is hit from side k % 2 and bounces on bar k on the far side
    const route: Point[] = [];
    bars.forEach((bar, k) => {
      const from = k % 2;
      route.push({ x: xs[from], y: area.top + height * between([0.3, 0.75]) });
      const far = from === 0 ? between([0.62, 0.82]) : between([0.18, 0.38]);
      route.push({ x: bar.box.x + bar.box.width * far, y: bar.center.y });
    });
    const path = hops(route, legMs, LIFT, serveMs);
    // landings alternate: a bar bounce, then the other player's return
    const landings = path.bounces.map((b, i) => ({
      bounce: b,
      bar: i % 2 === 0 ? bars[i / 2] : null,
    }));
    const hits = [
      { at: route[0], ms: path.startMs, normal: -Math.PI / 2 },
      ...landings.filter((l) => !l.bar).map((l) => l.bounce),
    ];
    const bounces = landings.filter((l) => l.bar);
    const last = bounces[bounces.length - 1];
    const endAt = path.endMs;
    // each player glides to meet its next return
    const players = xs.map((x) => {
      const own = hits.filter((h) => h.at.x === x);
      const at: Point = { x, y: own[0]?.at.y ?? area.top + height / 2 };
      return (ms: number): Point => {
        let k = 0;
        while (k < own.length && ms >= own[k].ms) k++;
        if (k === 0 || k === own.length) {
          at.y = own[Math.min(k, own.length - 1)]?.at.y ?? at.y;
          return at;
        }
        const a = own[k - 1];
        const b = own[k];
        at.y = lerp(
          [a.at.y, b.at.y],
          smoothstep(clamp01((ms - a.ms) / (b.ms - a.ms || 1))),
        );
        return at;
      };
    });

    const returning = createBeats(
      hits,
      (h) => h.ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const bouncing = createBeats(
      bounces,
      (l) => l.bounce.ms,
      (l, k) => {
        const bar = l.bar!;
        cover!.tierUp(bar, l.bounce.at);
        if (l === last) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(l.bounce.at);
          return;
        }
        cover!.burst(l.bounce.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, bounces.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          returning.tick(ms, now);
          bouncing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const h of hits)
            drawBounceSplash(ctx, h, ms - h.ms, HIT_SPLASH, now);
          for (const l of bounces)
            drawBounceSplash(ctx, l.bounce, ms - l.bounce.ms, SPLASH, now);
          for (const p of players)
            drawWispBetween(ctx, p, ms, now, WISP_SIZE * PLAYER, 0.7, 0, endAt);
          drawWispBetween(
            ctx,
            path.at,
            ms,
            now,
            WISP_SIZE * BALL,
            1,
            path.startMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
