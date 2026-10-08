// the "Speedboat" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp speedboat roars off the clicked floor's
// button and carves across the screen in hard S-turns, ever faster, its
// wake a great V of cash spreading out behind it; every turn throws up a
// spray with a whoosh and a jolt; then it bolts into the total and the
// whole wake washes in after it in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { alongRoute, bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "speedboat";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.5;
const TURNS = 4;
// the wake spreads out sideways at SPREAD px per ms, up to WAKE px, its
// arms a spray SPRAY px wide
const SPREAD = 0.35;
const WAKE = 170;
const SPRAY = 14;
const WASH_SPREAD = 300;
const LIFT = 60;
const SPRAY_COINS = 12;
const TURN_SHAKE: [number, number] = [0.6, 1.4];

export const forceSpeedboatEvent = registerWispEvent(
  KEY,
  "Speedboat",
  () => CONFIG.speedboatEvent.chance,
  (floor, context, area) => {
    const { runMs, flightMs, holdMs, mergeMs } = CONFIG.speedboatEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // S-turns from side to side, climbing the screen
    const turns: Point[] = Array.from({ length: TURNS }, (_, k) => ({
      x: area.left + width * (k % 2 === 0 ? 0.15 : 0.85),
      y: lerp(
        [area.bottom - 0.2 * height, area.top + 0.3 * height],
        k / (TURNS - 1),
      ),
    }));
    const route: Point[] = [button, ...turns, fallback];
    const share = (ms: number) => {
      const t = clamp01(ms / runMs);
      return 0.35 * t + 0.65 * t * t;
    };
    const timeAt = (u: number) =>
      runMs * ((-0.35 + Math.sqrt(0.1225 + 2.6 * u)) / 1.3);
    const boat = (ms: number, into: Point): Point =>
      alongRoute(route, share(ms), into);
    const washAt = runMs;
    const endAt = washAt + WASH_SPREAD + flightMs;

    // each coin drops off the stern at `leaves` and spreads out sideways
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const leaves = Math.random() * runMs * 0.97;
      const p = boat(leaves, { x: 0, y: 0 });
      const q = boat(leaves + 8, { x: 0, y: 0 });
      const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const side = Math.random() < 0.5 ? -1 : 1;
      const nx = (-(q.y - p.y) / d) * side;
      const ny = ((q.x - p.x) / d) * side;
      const jitter = (Math.random() * 2 - 1) * SPRAY;
      const washes = washAt + (leaves / runMs) * WASH_SPREAD;
      const out = (ms: number, into: Point): Point => {
        const reach = Math.min(WAKE, (ms - leaves) * SPREAD);
        into.x = p.x + nx * (reach + jitter);
        into.y = p.y + ny * (reach + jitter);
        return into;
      };
      const rest = out(washes, { x: 0, y: 0 });
      const lift: Point = { x: rest.x, y: rest.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: p.x, y: p.y, scale: 0 };
        if (ms < washes) {
          out(ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        const total = cover?.total() ?? fallback;
        bezier(
          rest,
          lift,
          total,
          easeIn(clamp01((ms - washes) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const hullAt: Point = { x: 0, y: 0 };
    const hull = (ms: number): Point | null =>
      ms < 0 || ms > runMs ? null : boat(ms, hullAt);

    const turning = createBeats(
      turns,
      (_, k) => timeAt((k + 1) / (route.length - 1)),
      (at, k) => {
        cover!.launchFrom(
          at,
          Array.from({ length: SPRAY_COINS }, () => ({
            x: at.x + (Math.random() * 2 - 1) * 140,
            y: at.y - 40 - Math.random() * 120,
          })),
        );
        cover!.burst(at, 0.35);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TURN_SHAKE, k / (TURNS - 1)));
      },
    );
    const washing = createBeats(
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
          turning.tick(ms, now);
          washing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            hull,
            ms,
            now,
            WISP_SIZE,
            easeOut(clamp01(ms / runMs)),
            0,
            runMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
