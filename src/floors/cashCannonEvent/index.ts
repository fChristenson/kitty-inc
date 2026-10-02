// the "Cash Cannon" event: it covers its crit, whose click freezes the screen
// while a scatter of wisps lights up across it like targets and the clicked
// floor's button opens fire, blasting a slug of cash at one after another,
// faster and faster; each slug slams its target, which bursts with a bang and
// a jolt and splashes the cash on into the total, until the last and biggest,
// high over the rest, goes up in a huge blast and shake, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "cashCannon";
const REWARD = 4;
// the targets, as shares of the screen across and down; the last is the big one
const TARGETS: Point[] = [
  { x: 0.2, y: 0.5 },
  { x: 0.8, y: 0.42 },
  { x: 0.25, y: 0.28 },
  { x: 0.75, y: 0.22 },
  { x: 0.5, y: 0.3 },
];
// each shot lobbed LOB of the screen's height over the straight line
const LOB = 0.08;
// the wisps, as shares of the screen's width, the last one BIG
const WISP = 0.06;
const BIG = 0.12;
const POP_MS = 200;
const POP_GAP_MS = 50;
const BOB = 5;
// each hit: a burst, a bang and a jolt
const HIT_BURST = 0.8;
const HIT_SHAKE = 1.6;

export const forceCashCannonEvent = registerWispEvent(
  KEY,
  "Cash Cannon",
  () => CONFIG.cashCannonEvent.chance,
  (floor, context, area) => {
    const { leadMs, gapsMs, slugMs, travelMs, holdMs, mergeMs } =
      CONFIG.cashCannonEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const flip = Math.random() < 0.5;
    let fireAt = leadMs;
    const shots = TARGETS.map((share, k) => {
      const at: Point = {
        x: area.left + width * (flip ? 1 - share.x : share.x),
        y: area.top + height * share.y,
      };
      const bend = {
        x: (button.x + at.x) / 2,
        y: (button.y + at.y) / 2 - height * LOB,
      };
      const line = sampleLine(
        (u) => bezier(button, bend, at, u, { x: 0, y: 0 }),
        50,
      );
      const start = fireAt;
      fireAt += gapsMs[Math.min(k, gapsMs.length - 1)];
      return {
        at,
        line,
        start,
        hitAt: start + travelMs,
        popAt: k * POP_GAP_MS,
      };
    });
    const pour: Pour = {
      coinsAlong: 700,
      width: 40,
      streamMs: slugMs,
      travelMs,
    };
    const lastShot = shots[shots.length - 1];
    const durationMs = Math.max(
      pourDurationMs(lastShot.start, pour),
      lastShot.hitAt + holdMs + mergeMs,
    );
    const bob = { x: 0, y: 0 };
    const targets = shots.map((shot, k) => (ms: number): Point | null => {
      if (ms < shot.popAt || ms >= shot.hitAt) return null;
      bob.x = shot.at.x;
      bob.y = shot.at.y + Math.sin(ms * 0.006 + k * 1.7) * BOB;
      return bob;
    });

    const fires = createBeats(
      shots,
      (s) => s.start,
      (shot) => {
        pourLine(cover!, shot.line, pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const hits = createBeats(
      shots,
      (s) => s.hitAt,
      (shot, k) => {
        if (k === shots.length - 1) {
          cover!.blast(shot.at);
          return;
        }
        cover!.burst(shot.at, HIT_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          fires.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          shots.forEach((shot, k) => {
            const size =
              Math.max(
                WISP_SIZE,
                width * (k === shots.length - 1 ? BIG : WISP),
              ) * easeOutBack(clamp01((ms - shot.popAt) / POP_MS));
            const heat = lerp([0.2, 1], clamp01(ms / shot.hitAt));
            drawWispBetween(
              ctx,
              targets[k],
              ms,
              now,
              size,
              heat,
              shot.popAt,
              shot.hitAt,
            );
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
