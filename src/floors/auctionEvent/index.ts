// the "Auction" event (experiment: an auction; cash): it covers its crit,
// whose click freezes the screen while a gavel wisp rises over the middle
// of the screen and bids flash up in big text, climbing fast: "$1K!",
// "$10K!", "$1M!"..., each bid a bang of the gavel slamming down, a flash, a
// jolt and a burst of coins; then it hangs high, trembling, "GOING ONCE!",
// "GOING TWICE!", the screen rumbling, until "SOLD!" lands with a huge
// gavel slam and a torrent of cash gushes out round the screen into the
// total in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../shared/critText";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import { COLOR } from "../../palette";

const KEY = "auction";
const REWARD = 4;
const BIDS = ["$1K!", "$10K!", "$100K!", "$1M!", "$1B!"];
// the gavel's strike spot, as a share of the screen's height
const STRIKE = 0.45;
const WINDUP_MS = 180;
const RAISE = 110;
const HIGH = 220;
const TREMBLE = 7;
const TEXT_UP = 230;
const CALL_MS = 300;
const BID_STYLE = { fontSize: 62, strokeWidth: 10 };
const CALL_STYLE = { fontSize: 56, strokeWidth: 9 };
const SOLD_STYLE = { fontSize: 96, strokeWidth: 14 };
const BID_GROW = 0.16;
const GAVEL = 0.8;
const COINS: [number, number] = [26, 60];
const COIN_REACH: [number, number] = [60, 240];
const BID_SHAKE: [number, number] = [0.6, 1.2];
const SOLD_SHAKE = 1.8;

interface Call {
  sprite: CritTextSprite;
  at: number;
  scale: number;
}

export const forceAuctionEvent = registerWispEvent(
  KEY,
  "Auction",
  () => CONFIG.auctionEvent.chance,
  (floor, context, area) => {
    const { bidsMs, callMs, pourMs, holdMs, mergeMs } = CONFIG.auctionEvent;
    const mid = (area.left + area.right) / 2;
    const strike: Point = {
      x: mid,
      y: area.top + (area.bottom - area.top) * STRIKE,
    };
    const textY = strike.y - TEXT_UP;
    let clock: number = WINDUP_MS;
    const bids = BIDS.map((label, k) => {
      const at = clock;
      clock += lerp(bidsMs, k / (BIDS.length - 1));
      return {
        at,
        k,
        sprite: createCritTextSprite(label, COLOR.heavenlyGold, BID_STYLE),
      };
    });
    const lastBid = bids[bids.length - 1].at;
    const once = lastBid + callMs * 1.3;
    const twice = once + callMs;
    const sold = twice + callMs;
    const calls: Call[] = [
      ...bids.map((b) => ({
        sprite: b.sprite,
        at: b.at,
        scale: 1 + b.k * BID_GROW,
      })),
      {
        sprite: createCritTextSprite(
          "GOING ONCE!",
          COLOR.heavenlyGold,
          CALL_STYLE,
        ),
        at: once,
        scale: 1,
      },
      {
        sprite: createCritTextSprite(
          "GOING TWICE!",
          COLOR.heavenlyGold,
          CALL_STYLE,
        ),
        at: twice,
        scale: 1.1,
      },
      {
        sprite: createCritTextSprite("SOLD!", COLOR.heavenlyGold, SOLD_STYLE),
        at: sold,
        scale: 1,
      },
    ];
    // every slam the gavel comes down on, and how high it's raised before it
    const slams = [
      { at: 0, high: 0 },
      ...bids.map((b) => ({ at: b.at, high: RAISE })),
      { at: sold, high: HIGH },
    ];
    const gavelAt: Point = { x: 0, y: 0 };
    const gavel = (ms: number): Point => {
      ms = Math.max(0, ms);
      gavelAt.x = strike.x;
      gavelAt.y = strike.y;
      if (ms >= sold) return gavelAt;
      let k = 1;
      while (k < slams.length - 1 && ms >= slams[k].at) k++;
      const from = slams[k - 1].at;
      const to = slams[k].at;
      const u = clamp01((ms - from) / (to - from));
      // raised fast, held, then brought down hard on the slam
      const hold = slams[k].high === HIGH ? 0.85 : 0.65;
      const lift =
        u < hold
          ? easeOut(Math.min(1, u / (hold * 0.5)))
          : 1 - easeIn((u - hold) / (1 - hold));
      gavelAt.y -= slams[k].high * lift;
      if (slams[k].high === HIGH && u < hold)
        gavelAt.x += Math.sin(ms * 0.09) * TREMBLE * lift;
      return gavelAt;
    };

    const total = totalSpot(area);
    const route: Point[] = [
      strike,
      { x: mid + 280, y: strike.y + 170 },
      { x: mid, y: strike.y + 330 },
      { x: mid - 290, y: strike.y + 150 },
      { x: mid - 210, y: total.y + 200 },
      total,
    ];
    const torrent = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 60);
    const pour: Pour = {
      coinsAlong: 1_400,
      width: 44,
      streamMs: pourMs * 0.6,
      travelMs: pourMs,
    };
    const endAt = sold + pourMs;
    const durationMs = Math.max(
      pourDurationMs(sold, pour),
      endAt + holdMs + mergeMs,
    );

    const bidding = createBeats(
      bids,
      (b) => b.at,
      (b) => {
        const t = b.k / (bids.length - 1);
        cover!.burst(strike, 0.5 + 0.4 * t);
        cover!.launchFrom(
          strike,
          ringTargets(strike, Math.round(lerp(COINS, t)), COIN_REACH),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BID_SHAKE, t));
      },
    );
    const going = createBeats(
      [once, twice],
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(0.5 + 0.3 * k);
      },
    );
    const selling = createBeats(
      [sold],
      (ms) => ms,
      () => {
        cover!.burst(strike, 1.6);
        pourLine(cover!, torrent, pour);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SOLD_SHAKE);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bidding.tick(ms, now);
          going.tick(ms, now);
          selling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > sold + CALL_MS * 2) return;
          for (let i = 0; i < calls.length; i++) {
            const c = calls[i];
            const next = calls[i + 1]?.at ?? c.at + CALL_MS * 2;
            if (ms < c.at || ms >= next) continue;
            const pop = 1 - clamp01((ms - c.at) / 120);
            const fade =
              i === calls.length - 1
                ? 1 - clamp01((ms - c.at - CALL_MS) / CALL_MS)
                : 1;
            ctx.globalAlpha = fade;
            drawCritTextSprite(
              ctx,
              c.sprite,
              mid,
              textY,
              c.scale * (1 + 0.6 * pop),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(ctx, gavel, ms, now, WISP_SIZE * GAVEL, 0.8, 0, sold);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
