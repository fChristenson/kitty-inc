// the "Volcano" event (money; cash): it covers its crit, whose click freezes
// the screen while the clicked floor's button blows its top: a roaring
// fountain of molten cash erupts out of it as the screen rumbles, and big
// wobbling lava bombs of cash are lobbed out one after another in high
// arcs, ever faster, each splatting across the screen with a bang and a
// jolt; then the whole eruption, fountain and splats, surges up into the
// total in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "volcano";
const REWARD = 4;
const FOUNTAIN_COINS = 500;
const BOMBS = 5;
const BOMB_COINS = 170;
const COIN = 0.55;
// the fountain shoots coins up at LAUNCH px per ms, SPREAD wide, under
// GRAVITY, falling back round the button within RAIN px
const LAUNCH: [number, number] = [0.9, 1.5];
const SPREAD = 0.35;
const GRAVITY = 0.0028;
const RAIN = 200;
// a bomb is BLOB px round, lobbed LOFT px over its higher end, splatting
// SPLAT px out and SQUASH as tall
const BLOB = 46;
const LOFT = 220;
const SPLAT: [number, number] = [30, 150];
const SQUASH = 0.45;
const SPLAT_MS = 200;
const SURGE_SPREAD = 260;
const LIFT = 80;
const RUMBLE_MS = 150;
const SPLAT_SHAKE: [number, number] = [0.8, 1.6];

export const forceVolcanoEvent = registerWispEvent(
  KEY,
  "Volcano",
  () => CONFIG.volcanoEvent.chance,
  (floor, context, area) => {
    const { eruptMs, bombGapsMs, lobMs, flightMs, holdMs, mergeMs } =
      CONFIG.volcanoEvent;
    const fallback = totalSpot(area);
    const vent = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    let clock = 80;
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      const at = clock;
      clock += lerp(bombGapsMs, k / (BOMBS - 1));
      const lands: Point = {
        x: area.left + width * (0.12 + 0.76 * Math.random()),
        y: area.top + height * (0.15 + 0.55 * Math.random()),
      };
      return {
        at,
        splats: at + lobMs,
        lands,
        arc: {
          x: (vent.x + lands.x) / 2,
          y: Math.min(vent.y, lands.y) - LOFT,
        },
      };
    });
    const lastSplat = bombs[BOMBS - 1].splats + SPLAT_MS;
    const surgeAt = Math.max(eruptMs + 500, lastSplat);
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    const surge = (
      from: Point,
      lift: Point,
      leaves: number,
      ms: number,
      at: Point,
    ) => {
      const total = cover?.total() ?? fallback;
      return bezier(
        from,
        lift,
        total,
        easeIn(clamp01((ms - leaves) / flightMs)),
        at,
      );
    };

    const fountain: CoinPath[] = Array.from({ length: FOUNTAIN_COINS }, () => {
      const fired = Math.random() * eruptMs;
      const vy = -between(LAUNCH);
      const vx = (Math.random() * 2 - 1) * SPREAD;
      const back = vent.y + Math.random() * 30;
      // time to come back down to `back`
      const air =
        (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * (back - vent.y))) / GRAVITY;
      const rest: Point = {
        x: vent.x + Math.max(-RAIN, Math.min(RAIN, vx * air)),
        y: back,
      };
      const leaves = surgeAt + Math.random() * SURGE_SPREAD;
      const lift: Point = { x: rest.x, y: rest.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < fired) return { x: vent.x, y: vent.y, scale: 0 };
        const t = ms - fired;
        if (t < air && ms < leaves) {
          return {
            x: vent.x + Math.max(-RAIN, Math.min(RAIN, vx * t)),
            y: vent.y + vy * t + 0.5 * GRAVITY * t * t,
            scale: COIN,
          };
        }
        if (ms < leaves) return { x: rest.x, y: rest.y, scale: COIN };
        surge(rest, lift, leaves, ms, at);
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const blobs: CoinPath[] = bombs.flatMap((bomb) =>
      Array.from({ length: BOMB_COINS }, () => {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const flung = between(SPLAT) * r;
        const phase = Math.random() * Math.PI * 2;
        const rest: Point = {
          x: bomb.lands.x + Math.cos(angle) * (BLOB * r + flung),
          y: bomb.lands.y + Math.sin(angle) * (BLOB * r + flung) * SQUASH,
        };
        const leaves = surgeAt + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: rest.x, y: rest.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        return (f) => {
          const ms = f * endAt;
          if (ms < bomb.at) return { x: vent.x, y: vent.y, scale: 0 };
          if (ms < bomb.splats) {
            bezier(vent, bomb.arc, bomb.lands, (ms - bomb.at) / lobMs, at);
            const wobble = 1 + 0.15 * Math.sin(ms * 0.03 + phase);
            return {
              x: at.x + Math.cos(angle) * BLOB * r * wobble,
              y: at.y + Math.sin(angle) * BLOB * r,
              scale: COIN,
            };
          }
          if (ms < leaves) {
            const u = easeOut(clamp01((ms - bomb.splats) / SPLAT_MS));
            return {
              x: lerp([bomb.lands.x + Math.cos(angle) * BLOB * r, rest.x], u),
              y: lerp([bomb.lands.y + Math.sin(angle) * BLOB * r, rest.y], u),
              scale: COIN,
            };
          }
          surge(rest, lift, leaves, ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        };
      }),
    );

    const rumbles = Array.from(
      { length: Math.floor(eruptMs / RUMBLE_MS) },
      (_, i) => i * RUMBLE_MS,
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (cover?.isLive())
          shakeScreen(lerp([0.4, 1], k / Math.max(1, rumbles.length - 1)));
      },
    );
    const splatting = createBeats(
      bombs,
      (b) => b.splats,
      (b, k) => {
        cover!.burst(b.lands, 0.5 + 0.1 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLAT_SHAKE, k / (BOMBS - 1)));
      },
    );
    const surging = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          splatting.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace([...fountain, ...blobs], endAt);
    playBoostEventStream();
  },
);
