// the "Badminton" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while two racket wisps fly out of the clicked floor's
// button to the top corners of the screen and rally a shuttlecock wisp in
// high, floating lobs; then one leaps and smashes it steeply down onto an
// empty spot with a crack and a jolt, and a new worker forms where it
// lands; rally after rally, ever quicker, the last smash landing in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "badminton";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
const EDGE = 110;
const TOP = 230;
const LOB = 160;
const SETUP_MS = 240;
const SMASH_MS = 130;
const RACKET = 0.45;
const SHUTTLE = 0.32;
const SMASH_SHAKE: [number, number] = [0.6, 1.3];

export const forceBadmintonEvent = registerWispEvent(
  KEY,
  "Badminton",
  () => CONFIG.badmintonEvent.chance,
  (floor, context, area) => {
    const { lobsMs, holdMs, mergeMs } = CONFIG.badmintonEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const posts: Point[] = [
      { x: area.left + EDGE, y: area.top + TOP },
      { x: area.right - EDGE, y: area.top + TOP },
    ];
    const rackets = posts.map((post, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01(ms / SETUP_MS));
        at.x = lerp([button.x, post.x], u);
        at.y = lerp([button.y, post.y], u) + Math.sin(ms / 120 + i * 2) * 6;
        return at;
      };
    });
    let clock: number = SETUP_MS;
    const rallies = hires.map((hire, k) => {
      const server = posts[k % 2];
      const smasher = posts[(k + 1) % 2];
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const ctrl: Point = { x: (server.x + smasher.x) / 2, y: server.y - LOB };
      const lobs = clock;
      const smashes = lobs + lerp(lobsMs, k / Math.max(1, hires.length - 1));
      const lands = smashes + SMASH_MS;
      clock = lands;
      const lob: Point = { x: 0, y: 0 };
      const smash: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        lobs,
        smashes,
        lands,
        lob: (ms: number): Point =>
          bezier(
            server,
            ctrl,
            smasher,
            easeOut(clamp01((ms - lobs) / (smashes - lobs))),
            lob,
          ),
        smash: (ms: number): Point => {
          const u = easeIn(clamp01((ms - smashes) / SMASH_MS));
          smash.x = lerp([smasher.x, spot.x], u);
          smash.y = lerp([smasher.y, spot.y], u);
          return smash;
        },
      };
    });
    const last = rallies[rallies.length - 1];
    const endAt = last.lands;

    const smashing = createBeats(
      rallies,
      (r) => r.smashes,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      rallies,
      (r) => r.lands,
      (r, k) => {
        giveHire(r.hire);
        if (r === last) {
          cover!.blast(r.spot);
          return;
        }
        cover!.burst(r.spot, 0.55);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, k / Math.max(1, rallies.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          smashing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const r of rackets)
            drawWispBetween(ctx, r, ms, now, WISP_SIZE * RACKET, 0.5, 0, endAt);
          for (const r of rallies) {
            drawWispBetween(
              ctx,
              r.lob,
              ms,
              now,
              WISP_SIZE * SHUTTLE,
              0.8,
              r.lobs,
              r.smashes,
            );
            drawWispBetween(
              ctx,
              r.smash,
              ms,
              now,
              WISP_SIZE * SHUTTLE,
              1,
              r.smashes,
              r.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
