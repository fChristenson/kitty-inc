// the "Pin the Tail" event (experiment: the party game; crit tiers): it
// covers its crit, whose click freezes the screen while a blindfolded wisp
// is spun round on the clicked floor's button and sent off, wandering in a
// dizzy, weaving stagger across the screen, until it lunges and pins an
// income bar dead centre: "PINNED!", a bang and a big jolt as the bar jumps
// a crit tier; it's spun again for the next bar, each stagger quicker, the
// last pin landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "pinTheTail";
const MAX_BARS = 3;
const SPIN = 30;
const SPIN_MS = 200;
const WANDER = 4;
const WOBBLE = 150;
const LUNGE_MS = 110;
const CALL_MS = 380;
const STYLE = { fontSize: 50, strokeWidth: 8 };
const PINNER = 0.45;
const PIN_SHAKE: [number, number] = [0.9, 1.5];

export const forcePinTheTailEvent = registerWispEvent(
  KEY,
  "Pin the Tail",
  () => CONFIG.pinTheTailEvent.chance,
  (floor, context) => {
    const { wanderMs, holdMs, mergeMs } = CONFIG.pinTheTailEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const pinned = createCritTextSprite("PINNED!", COLOR.heavenlyGold, STYLE);
    let clock = 0;
    let from: Point = button;
    const pins = bars.map((bar, k) => {
      const near: Point = { x: bar.center.x, y: bar.center.y - 90 };
      // a staggering route that wanders off course before homing in
      const route: Point[] = [from];
      for (let i = 1; i <= WANDER; i++) {
        const u = i / (WANDER + 1);
        route.push({
          x: lerp([from.x, near.x], u) + (Math.random() - 0.5) * WOBBLE * 2,
          y: lerp([from.y, near.y], u) + (Math.random() - 0.5) * WOBBLE,
        });
      }
      route.push(near);
      const spins = clock;
      const wanders = spins + SPIN_MS;
      const lunges = wanders + lerp(wanderMs, k / Math.max(1, bars.length - 1));
      const lands = lunges + LUNGE_MS;
      clock = lands;
      const pin = { bar, from, near, route, spins, wanders, lunges, lands };
      from = bar.center;
      return pin;
    });
    const last = pins[pins.length - 1];
    const endAt = last.lands;
    const pinnerAt: Point = { x: 0, y: 0 };
    const pinner = (ms: number): Point => {
      let p = pins[0];
      for (const pin of pins) if (ms >= pin.spins) p = pin;
      if (ms < p.wanders) {
        // spun round on the spot
        const a = ((ms - p.spins) / SPIN_MS) * Math.PI * 4;
        pinnerAt.x = p.from.x + Math.cos(a) * SPIN;
        pinnerAt.y = p.from.y + Math.sin(a) * SPIN;
        return pinnerAt;
      }
      if (ms < p.lunges)
        return alongRoute(
          p.route,
          clamp01((ms - p.wanders) / (p.lunges - p.wanders)),
          pinnerAt,
        );
      const u = easeIn(clamp01((ms - p.lunges) / LUNGE_MS));
      pinnerAt.x = lerp([p.near.x, p.bar.center.x], u);
      pinnerAt.y = lerp([p.near.y, p.bar.center.y], u);
      return pinnerAt;
    };

    const lunging = createBeats(
      pins,
      (p) => p.lunges,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const pinning = createBeats(
      pins,
      (p) => p.lands,
      (p, k) => {
        cover!.tierUp(p.bar, p.near);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PIN_SHAKE, k / Math.max(1, pins.length - 1)));
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
          lunging.tick(ms, now);
          pinning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const p of pins) {
            const c = (ms - p.lands) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              pinned,
              p.bar.center.x,
              p.bar.box.y - 60,
              (p === last ? 1.4 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
            );
            ctx.globalAlpha = 1;
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              pinner,
              ms,
              now,
              WISP_SIZE * PINNER,
              0.8,
              0,
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
