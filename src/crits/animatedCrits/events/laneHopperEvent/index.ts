// the "Lane Hopper" event (experiment: an arcade road-crossing game; free
// hires and cash): it covers its crit, whose click freezes the screen while
// lanes of cash start streaming across it like traffic, each lane the other
// way and faster than the last; a frog wisp hops out of the clicked
// floor's button and hops, hop by hop, across the lanes to an empty spot
// on a floor in view, where it lands with a pop and a jolt as a new
// worker, then hops on to the next, ever quicker; the last landing goes
// off in a huge blast and shake as the traffic pours into the total. Pays
// floor income × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "laneHopper";
const REWARD = 2;
const MAX_HIRES = 4;
const FORM_MS = 300;
const LANES = 6;
const PER_LANE = 34;
const COIN = 0.45;
// lanes stream at SPEED px per ms, SPEED_STEP faster each; the frog hops
// HOP px at a time, leaping LEAP px high
const SPEED = 0.18;
const SPEED_STEP = 0.05;
const HOP = 64;
const MAX_HOPS = 14;
const LEAP = 22;
const FROG = 0.5;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceLaneHopperEvent = registerWispEvent(
  KEY,
  "Lane Hopper",
  () => CONFIG.laneHopperEvent.chance,
  (floor, context, area) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.laneHopperEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    // every hop, spot to spot
    const hops: { from: Point; to: Point }[] = [];
    const arrivals: {
      hire: (typeof hires)[number];
      spot: Point;
      hop: number;
    }[] = [];
    let here: Point = button;
    let distance = 0;
    for (const hire of hires) {
      distance += Math.hypot(hire.x - here.x, hire.y - 26 - here.y);
      here = { x: hire.x, y: hire.y - 26 };
    }
    // long trips take longer hops, so it never drags on
    const hop = Math.max(HOP, distance / MAX_HOPS);
    here = button;
    for (const hire of hires) {
      const spot: Point = { x: hire.x, y: hire.y - 26 };
      const steps = Math.max(
        1,
        Math.round(Math.hypot(spot.x - here.x, spot.y - here.y) / hop),
      );
      for (let s = 1; s <= steps; s++)
        hops.push({
          from: {
            x: lerp([here.x, spot.x], (s - 1) / steps),
            y: lerp([here.y, spot.y], (s - 1) / steps),
          },
          to: {
            x: lerp([here.x, spot.x], s / steps),
            y: lerp([here.y, spot.y], s / steps),
          },
        });
      arrivals.push({ hire, spot, hop: hops.length - 1 });
      here = spot;
    }
    const starts: number[] = [];
    let clock = 200;
    hops.forEach((_, i) => {
      starts.push(clock);
      clock += lerp(hopsMs, i / Math.max(1, hops.length - 1));
    });
    const endAt = clock;
    const landsAt = (i: number) =>
      i + 1 < starts.length ? starts[i + 1] : endAt;
    const frogAt: Point = { x: 0, y: 0 };
    const frog = (ms: number): Point | null => {
      if (ms > endAt) return null;
      if (ms < starts[0]) return button;
      let i = 0;
      while (i < hops.length - 1 && ms >= starts[i + 1]) i++;
      const u = smoothstep(
        clamp01((ms - starts[i]) / ((landsAt(i) - starts[i]) * 0.7)),
      );
      frogAt.x = lerp([hops[i].from.x, hops[i].to.x], u);
      frogAt.y =
        lerp([hops[i].from.y, hops[i].to.y], u) - Math.sin(Math.PI * u) * LEAP;
      return frogAt;
    };

    const paths: CoinPath[] = [];
    for (let l = 0; l < LANES; l++) {
      const y = area.top + height * ((l + 0.5) / LANES);
      const dir = l % 2 === 0 ? 1 : -1;
      const speed = SPEED + SPEED_STEP * l;
      for (let i = 0; i < PER_LANE; i++) {
        // cars bunched into little convoys
        const offset =
          width * ((Math.floor(i / 4) + (i % 4) * 0.035) / (PER_LANE / 4));
        paths.push((f) => {
          const ms = f * endAt;
          const travelled = (offset + ms * speed * dir) % width;
          const x = area.left + ((travelled + width) % width);
          return {
            x,
            y: y + Math.sin(ms / 90 + i) * 2,
            scale: COIN * clamp01(ms / 200),
          };
        });
      }
    }

    const hopping = createBeats(
      starts,
      (ms) => ms,
      (_, i) => {
        if (cover?.isLive() && i % 2 === 0) playBloop();
      },
    );
    const landing = createBeats(
      arrivals,
      (a) => landsAt(a.hop),
      (a, k) => {
        giveHire(a.hire);
        if (k === arrivals.length - 1) {
          cover!.blast(a.spot);
          return;
        }
        cover!.burst(a.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, arrivals.length - 1)));
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
          hopping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(ctx, frog, ms, now, WISP_SIZE * FROG, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
