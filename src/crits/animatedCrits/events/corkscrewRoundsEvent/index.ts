// the "Corkscrew Rounds" event (gunfire; cash): it covers its crit, whose
// click freezes the screen while a gun wisp flies out of the clicked
// floor's button to the side of the screen and fires twin streams of
// bullets that corkscrew round each other in a double helix right across
// the screen, every round smacking into the far side with a pop and a burst
// of coins; volley after volley at new heights, ever faster, until every
// stream converges on the middle in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "corkscrewRounds";
const REWARD = 4;
const VOLLEYS = 3;
const PAIRS = 8;
const EDGE = 70;
const TOP = 240;
const SETUP_MS = 220;
// the helix winds TWISTS times across, AMP px either side
const TWISTS = 2.5;
const AMP = 46;
const FLASH_MS = 70;
const GUN = 0.55;
const ROUND = 0.3;
const COINS = 14;
const COIN_REACH: [number, number] = [20, 90];
const BANG_GAP_MS = 60;

export const forceCorkscrewRoundsEvent = registerWispEvent(
  KEY,
  "Corkscrew Rounds",
  () => CONFIG.corkscrewRoundsEvent.chance,
  (floor, context, area) => {
    const { shotMs, flightMs, volleysMs, holdMs, mergeMs } =
      CONFIG.corkscrewRoundsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const side = button.x > (area.left + area.right) / 2 ? -1 : 1;
    const gunX = side > 0 ? area.left + EDGE : area.right - EDGE;
    const farX = side > 0 ? area.right - EDGE : area.left + EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const middle: Point = { x: (gunX + farX) / 2, y: (top + bottom) / 2 };
    let clock: number = SETUP_MS;
    const rounds: {
      at: (ms: number) => Point;
      fires: number;
      hits: number;
      to: Point;
      final: boolean;
    }[] = [];
    const volleys = Array.from({ length: VOLLEYS + 1 }, (_, v) => {
      const final = v === VOLLEYS;
      const y = final ? middle.y : lerp([top, bottom], (v + 0.5) / VOLLEYS);
      const muzzle: Point = { x: gunX, y };
      const starts = clock;
      for (let p = 0; p < PAIRS; p++) {
        const fires = starts + p * shotMs;
        for (const phase of [0, Math.PI]) {
          const to: Point = final ? middle : { x: farX, y };
          const at: Point = { x: 0, y: 0 };
          const travel = final ? flightMs * 0.5 : flightMs;
          rounds.push({
            fires,
            hits: fires + travel,
            to,
            final,
            at: (ms: number): Point => {
              const u = clamp01((ms - fires) / travel);
              at.x = lerp([muzzle.x, to.x], u);
              at.y =
                lerp([muzzle.y, to.y], u) +
                Math.sin(u * Math.PI * 2 * TWISTS + phase) *
                  AMP *
                  Math.sin(u * Math.PI);
              return at;
            },
          });
        }
      }
      clock =
        starts +
        PAIRS * shotMs +
        (final ? 0 : lerp(volleysMs, v / (VOLLEYS - 1)));
      return { muzzle, starts, final };
    });
    const endAt = Math.max(...rounds.map((r) => r.hits));
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      if (ms < SETUP_MS) {
        const u = easeOut(clamp01(ms / SETUP_MS));
        gunAt.x = lerp([button.x, gunX], u);
        gunAt.y = lerp([button.y, volleys[0].muzzle.y], u);
        return gunAt;
      }
      let v = volleys[0];
      let prev = v;
      for (const volley of volleys)
        if (ms >= volley.starts - 120) {
          prev = v;
          v = volley;
        }
      const u = easeOut(clamp01((ms - (v.starts - 120)) / 120));
      gunAt.x = gunX;
      gunAt.y = lerp([prev.muzzle.y, v.muzzle.y], v === prev ? 1 : u);
      return gunAt;
    };
    let lastBang = -Infinity;

    const hitting = createBeats(
      rounds.filter((r) => !r.final),
      (r) => r.hits,
      (r) => {
        cover!.launchFrom(r.to, ringTargets(r.to, COINS, COIN_REACH));
        cover!.burst(r.to, 0.25);
        if (!cover!.isLive() || r.hits - lastBang < BANG_GAP_MS) return;
        lastBang = r.hits;
        playBloop();
        shakeScreen(0.4);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.launchFrom(middle, ringTargets(middle, COINS * 6, COIN_REACH));
        cover!.blast(middle);
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
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const r of rounds) {
            if (ms < r.fires || ms >= r.hits) continue;
            drawWispHead(ctx, r.at, ms, now, WISP_SIZE * ROUND, 1);
            const t = (ms - r.fires) / FLASH_MS;
            if (t < 1)
              drawMuzzleFlash(ctx, gun(ms), side > 0 ? 0 : Math.PI, t, 44);
          }
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
