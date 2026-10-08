// the "Ringer" event (experiment: the old game of marbles; cash): it covers
// its crit, whose click freezes the screen while a ring of light flashes up
// in the middle of the screen with marble wisps scattered inside it; a
// shooter marble flicks out of the clicked floor's button and cracks into a
// marble, which goes flying out of the ring and bursts into coins with a
// clack, a pop and a jolt; shot after shot, ever harder, until the last
// shot smashes into the pack and blasts every marble left out of the ring
// at once in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "ringer";
const REWARD = 4;
const MARBLES = 7;
const SHOTS = 3;
const RING = 170;
const SIDES = 20;
const RING_WIDTH = 8;
const RING_MS = 200;
// knocked marbles fly KNOCK px past the ring in knockMs
const KNOCK = 120;
const SETTLE_MS = 150;
const MARBLE = 0.35;
const SHOOTER = 0.42;
const COINS = 20;
const COIN_REACH: [number, number] = [30, 130];
const HIT_SHAKE: [number, number] = [0.6, 1.1];

export const forceRingerEvent = registerWispEvent(
  KEY,
  "Ringer",
  () => CONFIG.ringerEvent.chance,
  (floor, context, area) => {
    const { shotsMs, flickMs, knockMs, holdMs, mergeMs } = CONFIG.ringerEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const ring = Array.from({ length: SIDES + 1 }, (_, i): Point => {
      const a = (i / SIDES) * Math.PI * 2;
      return { x: hub.x + Math.cos(a) * RING, y: hub.y + Math.sin(a) * RING };
    });
    const spots = Array.from({ length: MARBLES }, (_, i): Point => {
      const a = (i / MARBLES) * Math.PI * 2 + 0.3;
      const r = i === 0 ? 0 : RING * (0.35 + (0.3 * ((i * 7) % 3)) / 2);
      return { x: hub.x + Math.cos(a) * r, y: hub.y + Math.sin(a) * r };
    });
    // the marbles each shot knocks out: one apiece, then the rest at once
    const order = spots
      .map((_, i) => i)
      .sort((a, b) => spots[b].y - spots[a].y);
    let clock: number = RING_MS;
    const shots = Array.from({ length: SHOTS + 1 }, (_, s) => {
      const final = s === SHOTS;
      const hits = final ? order.slice(SHOTS) : [order[s]];
      const target = final ? hub : spots[hits[0]];
      const fires = clock;
      const lands = fires + flickMs;
      clock = lands + (final ? 0 : lerp(shotsMs, s / (SHOTS - 1)));
      const at: Point = { x: 0, y: 0 };
      return {
        target,
        fires,
        lands,
        hits,
        final,
        // flicked from the button, stopping dead on the hit
        at: (ms: number): Point => {
          const u = easeIn(clamp01((ms - fires) / flickMs));
          at.x = lerp([button.x, target.x], u);
          at.y = lerp([button.y, target.y], u);
          return at;
        },
      };
    });
    const knocked = new Map<
      number,
      { lands: number; out: Point; done: number }
    >();
    for (const s of shots)
      for (const i of s.hits) {
        const p = spots[i];
        const dx = p.x - (s.final ? hub.x : button.x);
        const dy = p.y - (s.final ? hub.y : button.y);
        const d = Math.hypot(dx, dy) || 1;
        const reach =
          RING +
          KNOCK -
          (s.final ? 0 : Math.hypot(p.x - hub.x, p.y - hub.y) * 0.3);
        const out: Point = {
          x: hub.x + (dx / d) * reach,
          y: hub.y + (dy / d) * reach,
        };
        knocked.set(i, { lands: s.lands, out, done: s.lands + knockMs });
      }
    const marbles = spots.map((spot, i) => {
      const k = knocked.get(i)!;
      const at: Point = { x: 0, y: 0 };
      return {
        ...k,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - k.lands) / knockMs));
          at.x = lerp([spot.x, k.out.x], u);
          at.y = lerp([spot.y, k.out.y], u);
          return at;
        },
      };
    });
    const lastShot = shots[SHOTS];
    const endAt = lastShot.lands + knockMs;

    const clacking = createBeats(
      shots,
      (s) => s.lands,
      (s, k) => {
        cover!.burst(s.target, s.final ? 1 : 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / SHOTS));
      },
    );
    const bursting = createBeats(
      marbles,
      (m) => m.done,
      (m) => {
        cover!.launchFrom(m.out, ringTargets(m.out, COINS, COIN_REACH));
        cover!.burst(m.out, 0.5);
        if (m.lands === lastShot.lands) return;
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clacking.tick(ms, now);
          bursting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const show = clamp01(ms / RING_MS);
          for (let i = 1; i <= SIDES; i++)
            drawBeam(ctx, ring[i - 1], ring[i], RING_WIDTH, show * 0.7);
          for (const m of marbles)
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MARBLE,
              0.4,
              0,
              m.done,
            );
          for (const s of shots)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHOOTER,
              1,
              s.fires,
              s.lands + SETTLE_MS,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
