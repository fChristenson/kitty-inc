// the "Cattle Prod" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while a prod wisp zips out of the
// clicked floor's button to an income bar and jabs it again and again, every
// jab a short crackling bolt and a strike on the bar, a jolt and a few free
// levels, the jabs speeding up into a buzz; then it hops to the next bar,
// and the next, until the last bar takes one huge zap in a blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "cattleProd";
const MAX_BARS = 4;
const JABS = 5;
const HOVER = 80;
const REACH = 26;
const LUNGE_MS = 30;
const BOLT_MS = 90;
const ZAP_MS = 260;
const SKY = 120;
const PROD = 0.4;
const BANG_GAP_MS = 60;
const JAB_SHAKE: [number, number] = [0.3, 0.8];

interface Key {
  ms: number;
  at: Point;
}

interface Jab {
  bar: RewardBar;
  ms: number;
  hit: Point;
  bolt: Bolt;
}

export const forceCattleProdEvent = registerWispEvent(
  KEY,
  "Cattle Prod",
  () => CONFIG.cattleProdEvent.chance,
  (floor, context, area) => {
    const { hopMs, jabMs, levelShare, holdMs, mergeMs } =
      CONFIG.cattleProdEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // the prod's flight as keyframes, lerped between
    const keys: Key[] = [{ ms: 0, at: button }];
    const jabs: Jab[] = [];
    let clock = 0;
    for (const bar of bars) {
      const rest: Point = {
        x: bar.box.x + bar.box.width * (0.3 + 0.4 * Math.random()),
        y: bar.box.y - HOVER,
      };
      clock += hopMs;
      keys.push({ ms: clock, at: rest });
      for (let j = 0; j < JABS; j++) {
        const gap = lerp(jabMs, j / (JABS - 1));
        const lunge = Math.min(LUNGE_MS, gap * 0.4);
        const hit: Point = {
          x: rest.x + (Math.random() - 0.5) * 60,
          y: bar.box.y + bar.box.height * 0.3,
        };
        const jabAt = clock + gap;
        keys.push({ ms: jabAt - lunge, at: rest });
        keys.push({ ms: jabAt, at: { x: hit.x, y: hit.y - REACH } });
        keys.push({ ms: jabAt + lunge, at: rest });
        jabs.push({
          bar,
          ms: jabAt,
          hit,
          bolt: createBolt({ x: hit.x, y: hit.y - REACH }, hit, 1),
        });
        clock = jabAt + lunge;
      }
    }
    const lastBar = bars[bars.length - 1];
    const zapAt = clock + hopMs * 0.6;
    const zapBolt = createBolt(
      { x: lastBar.center.x, y: area.top + SKY },
      lastBar.center,
      4,
    );
    keys.push({
      ms: zapAt,
      at: { x: lastBar.center.x, y: lastBar.box.y - HOVER },
    });
    const endAt = zapAt + ZAP_MS;
    const prodAt: Point = { x: 0, y: 0 };
    const prod = (ms: number): Point => {
      let i = 0;
      while (i < keys.length - 2 && ms >= keys[i + 1].ms) i++;
      const a = keys[i];
      const b = keys[i + 1];
      const u = clamp01((ms - a.ms) / (b.ms - a.ms || 1));
      prodAt.x = lerp([a.at.x, b.at.x], u);
      prodAt.y = lerp([a.at.y, b.at.y], u);
      return prodAt;
    };
    let lastBang = -Infinity;

    const jabbing = createBeats(
      jabs,
      (j) => j.ms,
      (j, k) => {
        cover!.levels(
          j.bar,
          levelsFor(j.bar.floor, levelShare, 1),
          j.bolt.from,
        );
        cover!.burst(j.hit, 0.25);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(JAB_SHAKE, (k % JABS) / (JABS - 1)));
        if (j.ms - lastBang < BANG_GAP_MS) return;
        lastBang = j.ms;
        playExplosion();
      },
    );
    const zapping = createBeats(
      [zapAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.levels(lastBar, levelsFor(lastBar.floor), zapBolt.from);
        cover!.blast(lastBar.center);
        if (cover!.isLive()) playExplosion();
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
          jabbing.tick(ms, now);
          zapping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const j of jabs) {
            const t = (ms - j.ms) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, j.bolt, 1 - t, 0.45);
            drawStrike(ctx, j.hit, 1 - t, 0.7, now);
          }
          const z = (ms - zapAt) / ZAP_MS;
          if (z >= 0 && z < 1) {
            drawBolt(ctx, zapBolt, 1 - z, 2.2);
            drawStrike(ctx, lastBar.center, 1 - z, 3, now);
          }
          drawWispBetween(ctx, prod, ms, now, WISP_SIZE * PROD, 0.8, 0, zapAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
