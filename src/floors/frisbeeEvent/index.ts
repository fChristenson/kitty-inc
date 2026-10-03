// the "Frisbee" event (wisp; cash): it covers its crit, whose click freezes
// the screen while four catcher wisps scatter out of the clicked floor's
// button round the screen and a frisbee wisp sails between them in long
// curving throws, every catch a pop, a jolt and a burst of coins; the
// throws come ever faster and curve ever wider, until the last throw
// curls into the middle of the screen in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "frisbee";
const REWARD = 4;
const THROWS = 7;
const EDGE = 110;
const TOP = 220;
const SETUP_MS = 260;
// each throw curves CURVE of its length to one side
const CURVE: [number, number] = [0.3, 0.6];
const CATCHER = 0.45;
const DISC = 0.38;
const COINS = 20;
const COIN_REACH: [number, number] = [30, 130];
const CATCH_SHAKE: [number, number] = [0.5, 1.1];

export const forceFrisbeeEvent = registerWispEvent(
  KEY,
  "Frisbee",
  () => CONFIG.frisbeeEvent.chance,
  (floor, context, area) => {
    const { throwsMs, holdMs, mergeMs } = CONFIG.frisbeeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const posts: Point[] = [
      { x: left, y: top },
      { x: right, y: lerp([top, bottom], 0.35) },
      { x: lerp([left, right], 0.7), y: bottom },
      { x: left, y: lerp([top, bottom], 0.65) },
    ];
    const middle: Point = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const catchers = posts.map((post) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01(ms / SETUP_MS));
        at.x = lerp([button.x, post.x], u);
        at.y = lerp([button.y, post.y], u) + Math.sin(ms / 140 + post.x) * 5;
        return at;
      };
    });
    let clock: number = SETUP_MS;
    let holder = 0;
    const throws = Array.from({ length: THROWS }, (_, k) => {
      const final = k === THROWS - 1;
      const next = final ? -1 : (holder + 1 + (k % 2)) % posts.length;
      const a = posts[holder];
      const b = final ? middle : posts[next];
      const u = k / (THROWS - 1);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const side = (k % 2 === 0 ? 1 : -1) * lerp(CURVE, u);
      const ctrl: Point = {
        x: (a.x + b.x) / 2 - dy * side,
        y: (a.y + b.y) / 2 + dx * side,
      };
      const leaves = clock;
      clock += lerp(throwsMs, u);
      const caught = clock;
      holder = next;
      const at: Point = { x: 0, y: 0 };
      return {
        to: b,
        leaves,
        caught,
        final,
        at: (ms: number): Point =>
          bezier(a, ctrl, b, clamp01((ms - leaves) / (caught - leaves)), at),
      };
    });
    const last = throws[THROWS - 1];
    const endAt = last.caught;
    const disc = (ms: number): Point => {
      let t = throws[0];
      for (const th of throws) if (ms >= th.leaves) t = th;
      return t.at(ms);
    };

    const catching = createBeats(
      throws,
      (t) => t.caught,
      (t, k) => {
        cover!.launchFrom(
          t.to,
          ringTargets(t.to, t.final ? COINS * 2 : COINS, COIN_REACH),
        );
        if (t.final) {
          cover!.blast(t.to);
          return;
        }
        cover!.burst(t.to, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CATCH_SHAKE, k / (THROWS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => catching.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const c of catchers)
            drawWispBetween(
              ctx,
              c,
              ms,
              now,
              WISP_SIZE * CATCHER,
              0.4,
              0,
              endAt,
            );
          drawWispBetween(
            ctx,
            disc,
            ms,
            now,
            WISP_SIZE * DISC,
            1,
            SETUP_MS,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
