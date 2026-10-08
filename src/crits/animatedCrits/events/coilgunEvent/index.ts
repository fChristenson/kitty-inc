// the "Coilgun" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while a row of electric coils crackles up in a
// line from the clicked floor's button to an income bar, and a slug wisp is
// fired down it: every coil it passes discharges in a blinding arc, kicking
// it faster and faster, until it slams into the bar with a bang and a big
// jolt and the bar jumps a crit tier; new coils line up to the next bar
// and the next, the last shot slamming home in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
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
import { findRewardBars } from "../../eventRewards";

const KEY = "coilgun";
const MAX_BARS = 3;
const COILS = 4;
const SPREAD = 34;
const CHARGE_MS = 200;
const ZAP_MS = 140;
const SLUG = 0.38;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceCoilgunEvent = registerWispEvent(
  KEY,
  "Coilgun",
  () => CONFIG.coilgunEvent.chance,
  (floor, context) => {
    const { shotMs, holdMs, mergeMs } = CONFIG.coilgunEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const shots = bars.map((bar, k) => {
      const a = from;
      const b = bar.center;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d;
      const ny = dx / d;
      const charges = clock;
      const fires = charges + CHARGE_MS;
      const ms = lerp(shotMs, k / Math.max(1, bars.length - 1));
      const hits = fires + ms;
      clock = hits;
      const coils = Array.from({ length: COILS }, (_, i) => {
        const u = (i + 1) / (COILS + 1);
        const c: Point = { x: lerp([a.x, b.x], u), y: lerp([a.y, b.y], u) };
        // the slug speeds up as u², so it passes coil u at sqrt(u)
        return {
          at: c,
          passes: fires + ms * Math.sqrt(u),
          bolt: createBolt(
            { x: c.x + nx * SPREAD, y: c.y + ny * SPREAD },
            { x: c.x - nx * SPREAD, y: c.y - ny * SPREAD },
            0,
          ) as Bolt,
        };
      });
      from = { x: b.x, y: b.y - 120 };
      return { bar, a, b, charges, fires, hits, coils };
    });
    const last = shots[shots.length - 1];
    const endAt = last.hits;
    const slugAt: Point = { x: 0, y: 0 };
    const slug = (ms: number): Point => {
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.charges) s = shot;
      const u = clamp01((ms - s.fires) / (s.hits - s.fires));
      slugAt.x = lerp([s.a.x, s.b.x], u * u);
      slugAt.y = lerp([s.a.y, s.b.y], u * u);
      return slugAt;
    };
    const zaps = shots.flatMap((s) => s.coils);

    const zapping = createBeats(
      zaps,
      (z) => z.passes,
      () => {
        if (cover?.isLive()) shakeScreen(0.4);
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.tierUp(s.bar, s.a);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.b);
          return;
        }
        cover!.burst(s.b, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
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
          zapping.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const s of shots) {
            if (ms < s.charges || ms > s.hits + ZAP_MS) continue;
            for (const c of s.coils) {
              const t = (ms - c.passes) / ZAP_MS;
              const zap = t >= 0 && t < 1 ? 1 - t : 0;
              const idle =
                ms < c.passes ? 0.3 * clamp01((ms - s.charges) / CHARGE_MS) : 0;
              drawBolt(ctx, c.bolt, Math.max(idle, zap), 0.5 + zap);
              if (zap > 0) drawStrike(ctx, c.at, zap, 0.8, now);
            }
          }
          drawWispBetween(ctx, slug, ms, now, WISP_SIZE * SLUG, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
