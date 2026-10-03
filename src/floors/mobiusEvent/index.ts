// the "Mobius" event (money; cash): it covers its crit, whose click
// freezes the screen while cash pours out of the clicked floor's button
// and loops itself into a great twisted band, a Möbius strip hanging in the
// middle of the screen, which starts to turn, its one edge rolling over
// and over, ever faster, every half-turn a whoosh and a jolt; then it
// snaps and unzips from the cut, the whole band whipping off into the
// total as one long ribbon in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "mobius";
const REWARD = 4;
const COINS = 1_200;
const COIN = 0.5;
const DEPTH = 0.15;
// the band is RADIUS of the screen's width round, BAND of that wide, seen
// tilted TILT rad; it turns LAPS times, ever faster
const RADIUS = 0.3;
const BAND = 0.32;
const TILT = 1.05;
const LAPS = 2;
const FORM_SPREAD = 0.7;
const UNZIP_MS = 320;
const SPIN_SHAKE: [number, number] = [0.4, 1];

export const forceMobiusEvent = registerWispEvent(
  KEY,
  "Mobius",
  () => CONFIG.mobiusEvent.chance,
  (floor, context, area) => {
    const { formMs, spinMs, flightMs, holdMs, mergeMs } = CONFIG.mobiusEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const radius = (area.right - area.left) * RADIUS;
    const band = radius * BAND;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);
    const turn = (ms: number) =>
      Math.PI * 2 * LAPS * easeIn(clamp01((ms - formMs) / spinMs));
    const snapAt = formMs + spinMs;
    const endAt = snapAt + UNZIP_MS + flightMs;
    // a point on the band at (u, v) turned by `spin`, onto the screen
    const project = (u: number, v: number, spin: number, into: Point) => {
      const ring = radius + v * band * Math.cos(u / 2);
      const a = u + spin;
      const x = ring * Math.cos(a);
      const y = ring * Math.sin(a);
      const z = v * band * Math.sin(u / 2);
      into.x = cx + x;
      into.y = cy + y * cosT - z * sinT;
      return (y * sinT + z * cosT) / (radius + band);
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const u = (i / COINS) * Math.PI * 2;
      const v = Math.random() * 2 - 1;
      const sent = (i / COINS) * formMs * FORM_SPREAD;
      const flyMs = formMs * (1 - FORM_SPREAD);
      const leaves = snapAt + (i / COINS) * UNZIP_MS;
      const spot: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const ctrl: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < sent) return { x: button.x, y: button.y, scale: 0 };
        const depth = project(u, v, turn(Math.min(ms, snapAt)), spot);
        const scale = COIN * (1 + DEPTH * depth);
        if (ms < sent + flyMs) {
          const p = easeOut((ms - sent) / flyMs);
          return {
            x: lerp([button.x, spot.x], p),
            y: lerp([button.y, spot.y], p),
            scale,
          };
        }
        if (ms < leaves) return { x: spot.x, y: spot.y, scale };
        const total = cover?.total() ?? fallback;
        ctrl.x = spot.x;
        ctrl.y = spot.y - 120;
        bezier(
          spot,
          ctrl,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const halves = Array.from(
      { length: LAPS * 2 },
      (_, k) => formMs + spinMs * Math.sqrt((k + 1) / (LAPS * 2)),
    );
    const turning = createBeats(
      halves.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        cover!.burst({ x: cx, y: cy }, 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SPIN_SHAKE, k / Math.max(1, halves.length - 2)));
      },
    );
    const finale = createBeats(
      [snapAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst({ x: cx + radius, y: cy }, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.4);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
