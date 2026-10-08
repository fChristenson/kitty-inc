// the "Jumper Cables" event (lightning; cash): it covers its crit, whose click
// freezes the screen while two clamp wisps leap out of the clicked floor's
// button to either side of the screen and a fat bolt surges across between
// them with a crack and a jolt, coins bursting out all along it; they hop
// to new spots and surge again and again, ever faster and harder; then
// they slam together in the middle in a huge blast and shake. Pays floor
// income × floor number × REWARD
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";

const KEY = "jumperCables";
const REWARD = 4;
const SURGES = 5;
const HOP_MS = 180;
const SURGE_MS = 200;
const EDGE = 50;
const TOP = 220;
const SPOTS = 4;
const SPOT_COINS = 4;
const SPOT_REACH: [number, number] = [20, 70];
const CLAMP = 0.5;
const SURGE_SHAKE: [number, number] = [0.6, 1.4];

export const forceJumperCablesEvent = registerWispEvent(
  KEY,
  "Jumper Cables",
  () => CONFIG.jumperCablesEvent.chance,
  (floor, context, area) => {
    const { surgesMs, slamMs, holdMs, mergeMs } = CONFIG.jumperCablesEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const spot = (side: number): Point => ({
      x:
        side < 0
          ? lerp([area.left + EDGE, center.x - 120], Math.random())
          : lerp([center.x + 120, area.right - EDGE], Math.random()),
      y: lerp([area.top + TOP, area.bottom - EDGE], Math.random()),
    });
    let clock = 0;
    const surges = Array.from({ length: SURGES }, (_, k) => {
      const ends: [Point, Point] = [spot(-1), spot(1)];
      const hops = clock;
      const at = hops + HOP_MS;
      clock = at + lerp(surgesMs, k / (SURGES - 1));
      return { ends, hops, at, bolt: createBolt(ends[0], ends[1], 2) };
    });
    const slamAt = clock + slamMs;
    const endAt = slamAt;
    const clamps = [0, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        let from: Point = button;
        let s = surges[0];
        for (let k = 0; k < SURGES; k++)
          if (ms >= surges[k].hops) {
            s = surges[k];
            from = k === 0 ? button : surges[k - 1].ends[side];
          }
        if (ms >= clock) {
          const u = easeIn(clamp01((ms - clock) / slamMs));
          const last = surges[SURGES - 1].ends[side];
          at.x = lerp([last.x, center.x], u);
          at.y = lerp([last.y, center.y], u);
          return at;
        }
        const u = easeOut(clamp01((ms - s.hops) / HOP_MS));
        at.x = lerp([from.x, s.ends[side].x], u);
        at.y = lerp([from.y, s.ends[side].y], u);
        return at;
      };
    });

    const surging = createBeats(
      surges,
      (s) => s.at,
      (s, k) => {
        for (let i = 1; i <= SPOTS; i++) {
          const p: Point = {
            x: lerp([s.ends[0].x, s.ends[1].x], i / (SPOTS + 1)),
            y: lerp([s.ends[0].y, s.ends[1].y], i / (SPOTS + 1)),
          };
          cover!.launchFrom(p, ringTargets(p, SPOT_COINS, SPOT_REACH));
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const slam = createBeats(
      [slamAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          surging.tick(ms, now);
          slam.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const s of surges) {
            const t = (ms - s.at) / SURGE_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, 1.2);
            drawStrike(ctx, s.ends[0], 1 - t, 0.8, now);
            drawStrike(ctx, s.ends[1], 1 - t, 0.8, now);
          }
          for (const c of clamps)
            drawWispBetween(ctx, c, ms, now, WISP_SIZE * CLAMP, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
