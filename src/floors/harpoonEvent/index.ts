// the "Harpoon" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// fires harpoon wisps one after another, each streaking dead straight into
// an income bar in view at the head of a taut line of flowing cash and
// spearing it with a thunk, a burst, a jolt and free levels; the lines
// pour on, then two hard tugs yank every speared bar back toward the button,
// each a jolt and more levels; then the harpoons are ripped free and
// whipped up into the total-income readout in a huge blast and shake, the
// coins sweeping in after them. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "harpoon";
const REWARD = 3;
const MAX_BARS = 3;
const TUGS = 2;
const TUG_PULL = 14;
const TUG_MS = 120;
const HARPOON = 0.03;
const HIT_SHAKE: [number, number] = [0.8, 1.3];
const TUG_SHAKE = [0.9, 1.4];

export const forceHarpoonEvent = registerWispEvent(
  KEY,
  "Harpoon",
  () => CONFIG.harpoonEvent.chance,
  (floor, context, area) => {
    const {
      fireGapMs,
      flightMs,
      streamMs,
      tugGapMs,
      ripMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.harpoonEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const dist = (p: Point) => Math.hypot(p.x - button.x, p.y - button.y);
    const bars = findRewardBars(floor, context)
      .sort((a, b) => dist(a.center) - dist(b.center))
      .slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const shots = bars.map((bar, k) => {
      const to = bar.center;
      const firedAt = k * fireGapMs;
      const line = sampleLine(
        (u) => ({
          x: lerp([button.x, to.x], u),
          y: lerp([button.y, to.y], u),
        }),
        30,
      );
      const length = dist(to) || 1;
      // a spot past the bar, so a tug jolts it back toward the button
      const beyond: Point = {
        x: to.x + ((to.x - button.x) / length) * 100,
        y: to.y + ((to.y - button.y) / length) * 100,
      };
      return {
        bar,
        to,
        beyond,
        line,
        firedAt,
        hitAt: firedAt + flightMs,
        head: riverHead(line, flightMs, firedAt),
        spot: { x: 0, y: 0 },
      };
    });
    const pour: Pour = {
      coinsAlong: 220,
      width: 22,
      streamMs,
      travelMs: flightMs,
    };
    const lastHit = shots[shots.length - 1].hitAt;
    const tugs = Array.from(
      { length: TUGS },
      (_, k) => lastHit + (k + 1) * tugGapMs,
    );
    const ripAt = tugs[TUGS - 1] + tugGapMs;
    const inAt = ripAt + ripMs;
    const durationMs = Math.max(
      pourDurationMs(shots[shots.length - 1].firedAt, pour),
      inAt + holdMs + mergeMs,
    );
    const levels = bars.map((bar) => levelsFor(bar.floor, levelShare, 2));
    // each harpoon: flying out, lodged (yanked back on each tug), then
    // whipped up into the total
    const ats = shots.map((shot) => (ms: number): Point | null => {
      if (ms < shot.firedAt || ms > inAt) return null;
      if (ms < shot.hitAt) return shot.head(ms);
      if (ms < ripAt) {
        let pull = 0;
        for (const at of tugs)
          pull = Math.max(
            pull,
            Math.sin(Math.PI * clamp01((ms - at) / TUG_MS)),
          );
        const length = dist(shot.to) || 1;
        shot.spot.x =
          shot.to.x - ((shot.to.x - button.x) / length) * pull * TUG_PULL;
        shot.spot.y =
          shot.to.y - ((shot.to.y - button.y) / length) * pull * TUG_PULL;
        return shot.spot;
      }
      const total = cover?.total() ?? fallback;
      return bezier(
        shot.to,
        { x: shot.to.x, y: total.y },
        total,
        easeIn(clamp01((ms - ripAt) / ripMs)),
        shot.spot,
      );
    });
    const size = Math.max(WISP_SIZE * 0.7, width * HARPOON);

    const firing = createBeats(
      shots,
      (s) => s.firedAt,
      (s) => {
        if (!cover!.isLive()) return;
        pourLine(cover!, s.line, pour);
        playSwoosh();
      },
    );
    const spearing = createBeats(
      shots,
      (s) => s.hitAt,
      (s, k) => {
        cover!.levels(s.bar, levels[k], button);
        cover!.burst(s.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const tugging = createBeats(
      tugs,
      (ms) => ms,
      (_, k) => {
        shots.forEach((s, i) => cover!.levels(s.bar, levels[i], s.beyond));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(TUG_SHAKE[k]);
      },
    );
    const ripping = createBeats(
      [ripAt],
      (ms) => ms,
      () => {
        for (const s of shots) cover!.burst(s.to, 0.5);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          spearing.tick(ms, now);
          tugging.tick(ms, now);
          ripping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let k = 0; k < shots.length; k++)
            drawWispBetween(
              ctx,
              ats[k],
              ms,
              now,
              size,
              ms < shots[k].hitAt || ms > ripAt ? 0.9 : 0.5,
              shots[k].firedAt,
              inAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
