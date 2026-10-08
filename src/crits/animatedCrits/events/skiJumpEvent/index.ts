// the "Ski Jump" event: it covers its crit, whose click freezes the screen
// while a wisp drops in high on one side of it and skis down a slope of
// flowing cash that pours after it, carving through the dip at the bottom
// with a jolt and up the kicker on the far side; it launches off the lip with
// a flash, a whoosh and a big jolt and soars up over the screen, the whole
// river of cash flying off the lip after it, and lands in the total-income
// readout in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "skiJump";
const REWARD = 4;
// the run: from START (shares across and down) down into a DIP and up to a
// LIP on the far side, as shares of the screen across and down
const START = { x: 0.06, y: 0.2 };
const DIP = { x: 0.45, y: 0.86 };
const LIP = { x: 0.82, y: 0.62 };
const STEPS = 30;
const SKIER = 0.065;
const DIP_SHAKE = 1.2;
const LIP_BURST = 1.1;
const LIP_SHAKE = 2;

export const forceSkiJumpEvent = registerWispEvent(
  KEY,
  "Ski Jump",
  () => CONFIG.skiJumpEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.skiJumpEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const flip = Math.random() < 0.5;
    const spot = (s: { x: number; y: number }): Point => ({
      x: area.left + width * (flip ? 1 - s.x : s.x),
      y: area.top + height * s.y,
    });
    const start = spot(START);
    const dip = spot(DIP);
    const lip = spot(LIP);
    const line = [
      ...sampleLine(
        (u) => bezier(start, { x: start.x, y: dip.y }, dip, u, { x: 0, y: 0 }),
        STEPS,
      ),
      ...sampleLine(
        (u) => bezier(dip, { x: lip.x, y: dip.y }, lip, u, { x: 0, y: 0 }),
        STEPS,
      ).slice(1),
      // off the lip, up over the screen and down into the total
      ...sampleLine(
        (u) =>
          bezier(
            lip,
            { x: lip.x + (lip.x - dip.x) * 0.3, y: area.top - height * 0.05 },
            total,
            u,
            { x: 0, y: 0 },
          ),
        STEPS * 2,
      ).slice(1),
    ];
    const along = measure(line);
    const length = along[along.length - 1];
    const dipAt = (travelMs * along[STEPS]) / length;
    const lipAt = (travelMs * along[STEPS * 2]) / length;
    const pour: Pour = { coinsAlong: 2_000, width: 50, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );
    const skier = riverHead(line, travelMs);

    const beats = createBeats(
      [dipAt, lipAt, travelMs],
      (ms) => ms,
      (_, k) => {
        if (k === 2) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        if (k === 1) cover!.burst(lip, LIP_BURST);
        if (!cover!.isLive()) return;
        if (k === 0) {
          playBloop();
          shakeScreen(DIP_SHAKE);
          return;
        }
        playSwoosh();
        shakeScreen(LIP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            skier,
            ms,
            now,
            Math.max(WISP_SIZE, width * SKIER),
            ms > lipAt ? 1 : 0.5,
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
