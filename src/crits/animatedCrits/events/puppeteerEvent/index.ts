// the "Puppeteer" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a puppeteer wisp rises out of
// the clicked floor's button to the top of the screen and lets down strings
// of cash onto the workers one after another; it yanks each string in turn,
// the worker jerking with a flash and a jolt as it climbs a perma tier, the
// yanks quickening; its last yank pulls every string at once in a huge blast
// and shake. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "puppeteer";
const REWARD = 2;
const MAX_WORKERS = 5;
const TOP = 210;
// the strings fan out from the puppeteer's hand, this far apart at the top
const HAND = 26;
const ABOVE = 40;
const STEPS = 20;
const JERK = 34;
const JERK_MS = 90;
const DROP_GAP_MS = 70;
const YANK_SHAKE: [number, number] = [0.6, 1.2];
const MASTER = 0.65;

export const forcePuppeteerEvent = registerWispEvent(
  KEY,
  "Puppeteer",
  () => CONFIG.puppeteerEvent.chance,
  (floor, context, area) => {
    const { riseMs, stringMs, yanksMs, holdMs, mergeMs } =
      CONFIG.puppeteerEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const hand: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const riseCtrl: Point = { x: button.x, y: hand.y };
    const n = workers.length;
    const dropsDone = riseMs + DROP_GAP_MS * (n - 1) + stringMs;
    let clock = dropsDone;
    const strings = workers.map((worker, k) => {
      const top: Point = { x: hand.x + (k - (n - 1) / 2) * HAND, y: hand.y };
      const end: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const line = sampleLine(
        (u) => ({ x: lerp([top.x, end.x], u), y: lerp([top.y, end.y], u) }),
        STEPS,
      );
      const drops = riseMs + DROP_GAP_MS * k;
      const final = k === n - 1;
      const yanks = clock;
      if (!final) clock += lerp(yanksMs, k / Math.max(1, n - 2));
      return { worker, line, drops, yanks, final, k };
    });
    const endAt = clock;
    const pours = strings.map(
      (s): Pour => ({
        coinsAlong: 110,
        width: 6,
        streamMs: endAt - s.drops,
        travelMs: stringMs,
      }),
    );
    const durationMs = Math.max(
      ...strings.map((s, k) => pourDurationMs(s.drops, pours[k])),
      endAt + holdMs + mergeMs,
    );
    const yankTimes = strings.map((s) => s.yanks);
    const at: Point = { x: 0, y: 0 };
    const master = (ms: number): Point => {
      const t = Math.max(0, ms);
      if (t < riseMs)
        return bezier(button, riseCtrl, hand, easeOut(clamp01(t / riseMs)), at);
      let jerk = 0;
      for (const y of yankTimes)
        if (t >= y) jerk += Math.exp(-(t - y) / JERK_MS);
      at.x = hand.x;
      at.y = hand.y - JERK * Math.min(1.5, jerk);
      return at;
    };

    const dropping = createBeats(
      strings,
      (s) => s.drops,
      (s, k) => {
        pourLine(cover!, s.line, pours[k]);
        if (cover!.isLive() && k === 0) playSwoosh();
      },
    );
    const yanking = createBeats(
      strings,
      (s) => s.yanks,
      (s) => {
        if (s.final) {
          for (const w of strings) {
            cover!.promote(w.worker);
            cover!.burst(w.worker.at, 0.6);
          }
          cover!.blast(hand);
          return;
        }
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(YANK_SHAKE, s.k / Math.max(1, n - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          yanking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            master,
            ms,
            now,
            WISP_SIZE * MASTER,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
