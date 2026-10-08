// the "Whip Zoom" event (experiment: the camera itself; crit tiers): it
// covers its crit, whose click freezes the screen and the view whip-pans
// and slams in close on an income bar, which flashes with a bang and a jolt
// and jumps a crit tier, then whips across the frozen screen to the next
// bar, faster each time; after the last it snaps back out to the whole
// screen in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import {
  drawRewardBars,
  findRewardBars,
  type RewardBar,
} from "../../eventRewards";

const KEY = "whipZoom";
const MAX_BARS = 4;
const ZOOM = 2.3;
const LEAD_MS = 120;
const HIT_SHARE = 0.3;
const BURST_MS = 260;
const HIT_SHAKE: [number, number] = [0.8, 1.5];

interface Key {
  at: number;
  x: number;
  y: number;
  zoom: number;
}

export const forceWhipZoomEvent = registerWispEvent(
  KEY,
  "Whip Zoom",
  () => CONFIG.whipZoomEvent.chance,
  (floor, context, area) => {
    const { whipMs, holdsMs, outMs, holdMs, mergeMs } = CONFIG.whipZoomEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = { x: left + width / 2, y: top + height / 2 };
    const keys: Key[] = [
      { at: 0, ...mid, zoom: 1 },
      { at: LEAD_MS, ...mid, zoom: 1 },
    ];
    const hits: { bar: RewardBar; at: number; last: boolean }[] = [];
    let clock = LEAD_MS;
    bars.forEach((bar, k) => {
      const arrives = clock + whipMs;
      const hold = lerp(holdsMs, k / Math.max(1, bars.length - 1));
      keys.push({ at: arrives, ...bar.center, zoom: ZOOM });
      keys.push({ at: arrives + hold, ...bar.center, zoom: ZOOM });
      hits.push({
        bar,
        at: arrives + hold * HIT_SHARE,
        last: k === bars.length - 1,
      });
      clock = arrives + hold;
    });
    const endAt = clock + outMs;
    keys.push({ at: endAt, ...mid, zoom: 1 });
    const cam = { x: mid.x, y: mid.y, zoom: 1 };
    const camera = (ms: number) => {
      let j = 0;
      while (j < keys.length - 2 && ms >= keys[j + 1].at) j++;
      const a = keys[j];
      const b = keys[j + 1];
      const u = easeOutCubic(clamp01((ms - a.at) / Math.max(1, b.at - a.at)));
      cam.x = lerp([a.x, b.x], u);
      cam.y = lerp([a.y, b.y], u);
      cam.zoom = lerp([a.zoom, b.zoom], u);
      return cam;
    };
    // the view: the camera's spot at the middle of the screen, zoomed
    const look = (ctx: CanvasRenderingContext2D, ms: number) => {
      const c = camera(ms);
      ctx.translate(mid.x, mid.y);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-c.x, -c.y);
    };

    let shot: ScreenCopy | null = null;
    const hitting = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        cover!.tierUp(h.bar);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(mid);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.clip();
          look(ctx, ms);
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height,
          );
          // the live bars over their frozen selves, so their tiers land in view
          drawRewardBars(ctx, bars, now);
          ctx.restore();
        },
        drawOver: (ctx, ms) => {
          if (ms >= endAt) return;
          ctx.save();
          look(ctx, ms);
          for (const h of hits) {
            const t = (ms - h.at) / BURST_MS;
            if (t > 0 && t < 1)
              drawWhiteBurst(
                ctx,
                h.bar.center.x,
                h.bar.center.y,
                t,
                h.last ? 0.8 : 0.5,
              );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
