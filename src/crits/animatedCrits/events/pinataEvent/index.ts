// the "Pinata" event (wisp; cash): it covers its crit, whose click freezes
// the screen while a big fat wisp drops in and hangs swinging mid-screen like
// a piñata on an unseen string; small wisps dart in from every side and
// whack it, one after another, ever faster and harder, each whack a flash, a
// bloop, a jolt and coins knocked loose as it swings wilder, glowing hotter
// and swelling; then the last whack bursts it open in a huge blast and shake
// that sprays cash everywhere, and the coins sweep into the total. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";

const KEY = "pinata";
const REWARD = 4;
const HITS = 10;
// the piñata hangs STRING px below its pivot, swelling from SIZE[0] to SIZE[1]
const STRING = 300;
const SIZE: [number, number] = [2.2, 3.4];
const BAT = 0.6;
// hitters dart in from REACH px away and bounce back out over BOUNCE_MS
const REACH = 380;
const BOUNCE_MS = 260;
const STEP_MS = 4;
const GRAVITY = 0.000012; // rad per ms² per rad of swing
const DAMPING = 0.0006;
const KICK: [number, number] = [0.0025, 0.0055]; // rad per ms per whack
const KNOCK_COINS = 7;
const HIT_SHAKE: [number, number] = [0.5, 1.5];

export const forcePinataEvent = registerWispEvent(
  KEY,
  "Pinata",
  () => CONFIG.pinataEvent.chance,
  (floor, context, area) => {
    const { dropMs, gapsMs, holdMs, mergeMs } = CONFIG.pinataEvent;
    const pivot: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.38 - STRING,
    };
    const hits: { at: number; angle: number }[] = [];
    let clock = dropMs;
    for (let k = 0; k < HITS; k++) {
      clock += lerp(gapsMs, k / (HITS - 1));
      hits.push({ at: clock, angle: Math.random() * Math.PI * 2 });
    }
    const burstAt = hits[HITS - 1].at;
    // swing it out once at arm time, every whack kicking it the other way
    const steps = Math.ceil(burstAt / STEP_MS) + 1;
    const swing = new Float32Array(steps);
    let theta = 0;
    let omega = 0;
    let next = 0;
    for (let i = 0; i < steps; i++) {
      const ms = i * STEP_MS;
      while (next < HITS && ms >= hits[next].at) {
        const side = Math.cos(hits[next].angle) > 0 ? -1 : 1;
        omega += side * lerp(KICK, next / (HITS - 1));
        next++;
      }
      omega +=
        (-GRAVITY * STEP_MS * Math.sin(theta) * 1000) / STRING -
        DAMPING * omega;
      theta += omega * STEP_MS;
      swing[i] = theta;
    }
    const pinataInto: Point = { x: 0, y: 0 };
    const pinataAt = (ms: number, into = pinataInto): Point => {
      const t =
        swing[Math.min(steps - 1, Math.max(0, Math.round(ms / STEP_MS)))];
      // drops in from above the screen
      const drop =
        ms < dropMs ? (1 - easeOutBack(ms / dropMs)) * (STRING + 200) : 0;
      into.x = pivot.x + Math.sin(t) * STRING;
      into.y = pivot.y + Math.cos(t) * STRING - drop;
      return into;
    };
    const pinata = (ms: number): Point | null =>
      ms < 0 || ms >= burstAt ? null : pinataAt(ms);
    const bats = hits.map(({ at, angle }) => {
      const into: Point = { x: 0, y: 0 };
      const hitSpot: Point = { x: 0, y: 0 };
      const flyMs = 160;
      return (ms: number): Point | null => {
        const d = ms - at;
        if (d < -flyMs || d >= BOUNCE_MS) return null;
        pinataAt(at, hitSpot);
        const r = d < 0 ? REACH * (-d / flyMs) : REACH * 0.6 * (d / BOUNCE_MS);
        into.x = hitSpot.x + Math.cos(angle) * r;
        into.y = hitSpot.y + Math.sin(angle) * r;
        return into;
      };
    });

    const whacking = createBeats(
      hits.slice(0, -1),
      (h) => h.at,
      (h, k) => {
        const t = k / (HITS - 2);
        const at = { ...pinataAt(h.at) };
        cover!.burst(at, 0.5 + 0.4 * t);
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, KNOCK_COINS, [80, 240], h.angle + Math.PI, 1.6),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => cover!.blast({ ...pinataAt(burstAt) }, 60),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: burstAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          whacking.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / burstAt);
          const at = pinata(ms);
          if (at) drawBeam(ctx, pivot, at, 3, 0.25);
          drawWispBetween(
            ctx,
            pinata,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, heat),
            heat,
            0,
            burstAt,
          );
          for (let k = 0; k < bats.length; k++)
            drawWispBetween(
              ctx,
              bats[k],
              ms,
              now,
              WISP_SIZE * BAT,
              0.6,
              hits[k].at - 160,
              hits[k].at + BOUNCE_MS,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
