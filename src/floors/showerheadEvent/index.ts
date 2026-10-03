// the "Showerhead" event (money; free hires and cash): it covers its crit,
// whose click freezes the screen while a wisp shoots up out of the clicked
// floor's button to the top of the screen and turns into a showerhead,
// spraying a cone of rivers of cash down at every empty spot on the floors in
// view; as each river lands it splashes with a bloop and a jolt and a new
// worker forms there; the last lands in a huge blast and shake and the coins
// sweep into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "showerhead";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const TOP = 150;
const LIFT = 30;
const SPRAY_MS = 60;
const HEAD = 0.8;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceShowerheadEvent = registerWispEvent(
  KEY,
  "Showerhead",
  () => CONFIG.showerheadEvent.chance,
  (floor, context, area) => {
    const { riseMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.showerheadEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const head: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const pour: Pour = { coinsAlong: 500, width: 24, streamMs, travelMs };
    const sprays = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      // each river bows out the way it sprays
      const ctrl: Point = {
        x: head.x + (spot.x - head.x) * 1.2,
        y: lerp([head.y, spot.y], 0.25),
      };
      const line = sampleLine(
        (u) => bezier(head, ctrl, spot, u, { x: 0, y: 0 }),
        30,
      );
      const starts = riseMs + k * SPRAY_MS;
      return { hire, spot, line, starts, lands: starts + travelMs };
    });
    const last = sprays[sprays.length - 1];
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      last.lands + holdMs + mergeMs,
    );
    const headAt: Point = { x: 0, y: 0 };
    const headWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / riseMs));
      headAt.x = lerp([button.x, head.x], u);
      headAt.y = lerp([button.y, head.y], u);
      return headAt;
    };

    const spraying = createBeats(
      sprays,
      (s) => s.starts,
      (s) => pourLine(cover!, s.line, pour),
    );
    const landing = createBeats(
      sprays,
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        cover!.burst(s.spot, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, sprays.length - 1)));
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
          spraying.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            headWisp,
            ms,
            now,
            WISP_SIZE * HEAD,
            0.8,
            0,
            last.starts + streamMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
