// the "Chladni" event (money; cash): it covers its crit, whose click
// freezes the screen while the button sprays a cloud of cash over a square
// of the screen like sand on a Chladni plate; a tone hums and the coins
// dance and jitter into the plate's nodal lines, then the tone climbs and
// they shiver apart and snap into a new, finer figure, again and again,
// every change a hum and a jolt; on the last they leap up into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { totalSpot } from "../cashFlow";

const KEY = "chladni";
const REWARD = 4;
const COINS = 640;
const COIN = 0.4;
// the plate's modes, each (n, m), finer as the tone climbs
const MODES: [number, number][] = [
  [1, 2],
  [2, 3],
  [1, 4],
  [3, 5],
];
// how close to a nodal line a coin must settle, and the plate's size as a
// share of the screen
const NODE = 0.05;
const PLATE: [number, number] = [0.85, 0.55];
const SPRAY_MS = 320;
const SETTLE = 0.6;
const JITTER = 10;
const LEAP_MS = 380;
const TONE_SHAKE: [number, number] = [0.3, 0.8];

// a mode's nodal line: where cos(nπx)cos(mπy) - cos(mπx)cos(nπy) is zero
function nodes([n, m]: [number, number], count: number): Point[] {
  const points: Point[] = [];
  while (points.length < count) {
    const x = Math.random();
    const y = Math.random();
    const f =
      Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
      Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
    if (Math.abs(f) < NODE) points.push({ x, y });
  }
  return points;
}

export const forceChladniEvent = registerWispEvent(
  KEY,
  "Chladni",
  () => CONFIG.chladniEvent.chance,
  (floor, context, area) => {
    const { toneMs, holdMs, mergeMs } = CONFIG.chladniEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const side = Math.min(width * PLATE[0], height * PLATE[1]);
    const left = (area.left + area.right) / 2 - side / 2;
    const top = area.top + height * 0.5 - side / 2;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const figures = MODES.map((mode) =>
      nodes(mode, COINS).map((p) => ({
        x: left + p.x * side,
        y: top + p.y * side,
      })),
    );
    const tones = MODES.map((_, k) => SPRAY_MS + k * toneMs);
    const leaves = SPRAY_MS + MODES.length * toneMs;
    const travel = leaves + LEAP_MS;

    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const scatter: Point = {
        x: left + Math.random() * side,
        y: top + Math.random() * side,
      };
      const seed = Math.random() * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      const from: Point = { x: 0, y: 0 };
      const bend: Point = { x: 0, y: 0 };
      // where it's settling at ms: from the last figure to the current one,
      // shivering hardest as the tone changes
      const settled = (ms: number, into: Point) => {
        let k = -1;
        while (k + 1 < tones.length && ms >= tones[k + 1]) k++;
        if (k < 0) {
          const u = easeOut(clamp01(ms / SPRAY_MS));
          into.x = lerp([button.x, scatter.x], u);
          into.y = lerp([button.y, scatter.y], u);
          return into;
        }
        const was = k === 0 ? scatter : figures[k - 1][i];
        const now = figures[k][i];
        const u = clamp01((ms - tones[k]) / (toneMs * SETTLE));
        const shiver = JITTER * (1 - u);
        into.x =
          lerp([was.x, now.x], easeOut(u)) +
          Math.sin(ms * 0.06 + seed) * shiver;
        into.y =
          lerp([was.y, now.y], easeOut(u)) +
          Math.cos(ms * 0.07 + seed) * shiver;
        return into;
      };
      paths.push((f) => {
        const ms = f * travel;
        if (ms < leaves) return { ...settled(ms, at), scale: COIN };
        settled(leaves - 1, from);
        bend.x = from.x;
        bend.y = Math.min(from.y, total.y) - 120;
        const p = bezier(
          from,
          bend,
          total,
          easeIn(clamp01((ms - leaves) / LEAP_MS)),
          at,
        );
        return { x: p.x, y: p.y, scale: COIN };
      });
    }

    const toning = createBeats(
      tones,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TONE_SHAKE, k / (tones.length - 1)));
      },
    );
    const leaping = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          toning.tick(ms, now);
          leaping.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
