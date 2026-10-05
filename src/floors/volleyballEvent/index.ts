// the "Volleyball" event (bounce; free hires): it covers its crit, whose
// click freezes the screen while a net of light shoots up in the middle of
// it with two player wisps either side; the clicked floor's button serves a
// ball wisp over: a player bumps it up, the other sets it high by the net,
// then leaps and spikes it down at an empty spot in a blur, the ball smashing
// onto it as a new worker forms; it bounces back up into play and the far
// side bumps, sets and spikes, rally after rally, every touch a splash and a
// jolt, the last spike in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "volleyball";
const MAX_POINTS = 3;
// the court: the net's foot this far down the screen, this tall; players
// BUMP and SET px out from it, PLAYER_Y px over the net's foot
const COURT = 0.42;
const NET = 190;
const NET_W = 8;
const BUMP = 300;
const SET = 110;
const PLAYER_UP = 60;
// the ball's arcs: a bump's and a set's height, and the spiker's leap
const BUMP_LIFT = 200;
const SET_LIFT = 260;
const LEAP = 50;
const BALL = WISP_SIZE * 0.9;
const PLAYER = WISP_SIZE * 0.75;
const TOUCH_SHAKE = 0.35;
const SPIKE_SHAKE = 0.9;

interface Rally {
  side: number;
  hire: RewardHire;
  path: BouncePath;
  spikeAt: number;
  landsAt: number;
  from: Point;
  to: Point;
}

export const forceVolleyballEvent = registerWispEvent(
  KEY,
  "Volleyball",
  () => CONFIG.volleyballEvent.chance,
  (floor, context, area) => {
    const { growMs, legMs, spikeMs, holdMs, mergeMs } = CONFIG.volleyballEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_POINTS);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const foot = lerp([area.top, area.bottom], COURT);
    const netTop: Point = { x: cx, y: foot - NET };
    const netFoot: Point = { x: cx, y: foot };
    const playerY = foot - PLAYER_UP;
    // the side that plays each rally: the far side from the ball first
    const players = [-1, 1].flatMap((side) => [
      { side, at: { x: cx + side * BUMP, y: playerY } },
      { side, at: { x: cx + side * SET, y: playerY } },
    ]);

    let from: Point = button;
    let clock: number = growMs;
    const rallies: Rally[] = hires.map((hire, k) => {
      const side = (k % 2 === 0) === button.x > cx ? -1 : 1;
      const bump = { x: cx + side * BUMP, y: playerY };
      const set = { x: cx + side * SET, y: playerY - LEAP };
      const path = hops(
        [from, bump, set],
        [legMs, legMs * 0.9],
        [BUMP_LIFT, SET_LIFT],
        clock,
      );
      const spikeAt = path.endMs;
      const to: Point = { x: hire.x, y: hire.y };
      const rally = {
        side,
        hire,
        path,
        spikeAt,
        landsAt: spikeAt + spikeMs,
        from: set,
        to,
      };
      from = to;
      clock = rally.landsAt;
      return rally;
    });
    const last = rallies[rallies.length - 1];
    const endMs = last.landsAt;
    const touches: Bounce[] = rallies.flatMap((r) => r.path.bounces);

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const touching = createBeats(
      touches,
      (b) => b.ms,
      (b) => {
        cover!.burst(b.at, 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(TOUCH_SHAKE);
        playBloop();
      },
    );
    const spiking = createBeats(
      rallies,
      (r) => r.spikeAt,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      rallies,
      (r) => r.landsAt,
      (r) => {
        giveHire(r.hire);
        if (r === last) {
          cover!.blast(r.to);
          return;
        }
        cover!.burst(r.to, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SPIKE_SHAKE);
      },
    );

    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      for (const r of rallies) {
        if (ms > r.landsAt) continue;
        if (ms < r.path.startMs) return null;
        if (ms < r.spikeAt) return r.path.at(ms);
        const u = easeIn((ms - r.spikeAt) / (r.landsAt - r.spikeAt));
        ball.x = lerp([r.from.x, r.to.x], u);
        ball.y = lerp([r.from.y, r.to.y], u);
        return ball;
      }
      return null;
    };
    // a player springs up to meet the ball as it touches them
    const playerAt = players.map((p) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        let lift = 0;
        for (const b of touches) {
          if (Math.abs(b.at.x - p.at.x) > 1) continue;
          const t = Math.abs(ms - b.ms);
          if (t < 150) lift = Math.max(lift, (1 - t / 150) * LEAP);
        }
        spot.x = p.at.x;
        spot.y = p.at.y + Math.sin(ms / 160 + p.at.x) * 4 - lift;
        return spot;
      };
    });
    const net: Point = { x: cx, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          opening.tick(ms, now);
          touching.tick(ms, now);
          spiking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs + 300) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - endMs) / 300);
          net.y = lerp([netFoot.y, netTop.y], pop);
          drawBeam(ctx, netFoot, net, NET_W, 0.7 * fade);
          for (const b of touches)
            drawBounceSplash(ctx, b, ms - b.ms, 100, now);
          for (const p of playerAt)
            drawWisp(ctx, p, ms, now, PLAYER * pop * fade, 0.4);
          drawWispBetween(ctx, ballAt, ms, now, BALL, 0.9, growMs, endMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
