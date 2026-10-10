// the "Spin Cycle" event (money; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button gushes a torrent of
// cash up into a pool in the bottom of a big drum ringed with glimmers in
// the middle of the screen; the drum rocks and the pool sloshes up one wall
// and the other, then it spins up like a washing machine, the cash climbing
// the walls into a whirling ring pinned round the rim, faster and faster,
// every half turn a whoosh and a jolt; at full spin the drum's top flies
// open and the ring peels off it in one long gush that streams into the
// total in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "spinCycle";
const REWARD = 4;
const COINS = 380;
// the drum this far down the screen, its radius a share of the screen's
// width (at most MAX_R)
const DRUM_AT = 0.45;
const DRUM_R = 0.36;
const MAX_R = 300;
const STUDS = 20;
const STUD = 22;
// the pool: this wide an arc round the bottom, this deep
const POOL_ARC = 0.75;
const POOL_DEEP = 90;
// the coins' gush in, and how far it bows
const FLY_MS = 260;
const GUSH_BOW = 180;
// the rocking: ROCKS swings this far either way
const ROCKS = 2;
const ROCK = 1.0;
// laps a second at full spin; the ring's pinned this far in from the rim
const SPIN_HZ = 4.5;
const PIN_SHARE = 0.4;
const RING_IN: [number, number] = [6, 30];
// a coin peeling off the top bows this far along its flight
const PEEL = 220;
const ROCK_SHAKE = 0.35;
const SPIN_SHAKE: [number, number] = [0.3, 0.9];
const OPEN_SHAKE = 1;

export const forceSpinCycleEvent = registerWispEvent(
  KEY,
  "Spin Cycle",
  () => CONFIG.spinCycleEvent.chance,
  (floor, context, area) => {
    const { pourMs, rockMs, spinMs, liftMs, holdMs, mergeMs } =
      CONFIG.spinCycleEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const width = area.right - area.left;
    const r = Math.min(MAX_R, width * DRUM_R);
    const drum: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], DRUM_AT),
    };
    const rockAt = pourMs + FLY_MS;
    const spinAt = rockAt + rockMs;
    const openAt = spinAt + spinMs;
    const omega = (SPIN_HZ * Math.PI * 2) / 1000;
    const lapMs = 1000 / SPIN_HZ;
    // the drum's turn at ms: rocking, then spinning up to full speed
    const turnAt = (ms: number): number => {
      if (ms < rockAt) return 0;
      if (ms < spinAt)
        return ROCK * Math.sin(((ms - rockAt) / rockMs) * ROCKS * Math.PI * 2);
      if (ms < openAt) return (omega * (ms - spinAt) ** 2) / (2 * spinMs);
      return (omega * spinMs) / 2 + omega * (ms - openAt);
    };
    const pinAt = (ms: number) =>
      smoothstep(clamp01((ms - spinAt) / (spinMs * PIN_SHARE)));

    // each coin's spot in the pool, and in the ring once it's pinned
    const pool = Array.from({ length: COINS }, () => ({
      angle: Math.PI / 2 + (Math.random() - 0.5) * POOL_ARC * Math.PI,
      in: Math.sqrt(Math.random()) * POOL_DEEP,
    }));
    const ring = pool.map((_, i) => ({
      angle: (i / COINS) * Math.PI * 2 + Math.random() * 0.05,
      in: lerp(RING_IN, Math.random()),
    }));
    const inDrum = (i: number, ms: number, into: Point): Point => {
      const pin = pinAt(ms);
      const a = lerp([pool[i].angle, ring[i].angle], pin) + turnAt(ms);
      const rr = r - lerp([pool[i].in, ring[i].in], pin);
      into.x = drum.x + Math.cos(a) * rr;
      into.y = drum.y + Math.sin(a) * rr;
      return into;
    };
    // each coin peels off as it next passes the top once the drum's open
    const top = -Math.PI / 2;
    const peels = pool.map((_, i) => {
      const a = ring[i].angle + turnAt(openAt);
      const toTop = (((top - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return openAt + toTop / omega;
    });
    const lands = pool.map((_, i) => (pourMs * i) / COINS + FLY_MS);
    const lastIn = openAt + lapMs + liftMs;
    const travelMs = lastIn;

    const paths: CoinPath[] = pool.map((_, i) => {
      const launch = lands[i] - FLY_MS;
      const peel = peels[i];
      const rest = inDrum(i, lands[i], { x: 0, y: 0 });
      const bow: Point = {
        x: (button.x + rest.x) / 2 + (i % 2 ? GUSH_BOW : -GUSH_BOW) * 0.5,
        y: Math.min(button.y, rest.y) - GUSH_BOW,
      };
      const exit = inDrum(i, peel, { x: 0, y: 0 });
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < launch) return { x: button.x, y: button.y, scale: 0 };
        if (ms < lands[i])
          return bezier(button, bow, rest, easeOut((ms - launch) / FLY_MS), {
            x: 0,
            y: 0,
          });
        if (ms < peel) return inDrum(i, ms, { x: 0, y: 0 });
        const to = total();
        const u = clamp01((ms - peel) / liftMs);
        const p = bezier(
          exit,
          { x: exit.x + PEEL, y: exit.y - PEEL * 0.4 },
          to,
          easeIn(u),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: u >= 1 ? 0 : 1 };
      };
    });

    // a jolt at every rock's peak and every half turn of the spin
    const beats: number[] = [];
    for (let k = 0; k < ROCKS * 2; k++)
      beats.push(rockAt + ((k + 0.5) * rockMs) / (ROCKS * 2));
    const halves = Math.floor(turnAt(openAt - 1) / Math.PI);
    for (let k = 1; k <= halves; k++)
      beats.push(spinAt + Math.sqrt((2 * spinMs * k * Math.PI) / omega));
    const rocking = createBeats(
      beats,
      (ms) => ms,
      (ms, k) => {
        if (!cover!.isLive()) return;
        if (ms < spinAt) {
          shakeScreen(ROCK_SHAKE);
          playBloop();
          return;
        }
        shakeScreen(
          lerp(SPIN_SHAKE, (k - ROCKS * 2) / Math.max(1, halves - 1)),
        );
        playSwoosh();
      },
    );
    const opening = createBeats(
      [0, openAt, lastIn],
      (ms) => ms,
      (ms) => {
        if (ms === lastIn) {
          cover!.blast(total());
          return;
        }
        if (ms === openAt) cover!.burst({ x: drum.x, y: drum.y - r }, 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms === openAt) shakeScreen(OPEN_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          rocking.tick(ms, now);
          opening.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms > openAt + lapMs) return;
          const show =
            easeOut(clamp01(ms / pourMs)) *
            (1 - clamp01((ms - openAt) / lapMs));
          const turn = turnAt(ms);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let k = 0; k < STUDS; k++) {
            const a = (k / STUDS) * Math.PI * 2 + turn;
            stampGlimmer(
              ctx,
              drum.x + Math.cos(a) * (r + STUD),
              drum.y + Math.sin(a) * (r + STUD),
              STUD * show,
              a,
              k % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          stampGlimmer(
            ctx,
            drum.x,
            drum.y,
            STUD * 1.6 * show,
            turn,
            COLOR.white,
          );
          endLightBatch(ctx);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
