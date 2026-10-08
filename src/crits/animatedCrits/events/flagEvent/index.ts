// the "Flag" event (experiment; cash): it covers its crit, whose click
// freezes the screen and the whole frozen frame starts to ripple like a flag
// in a gale: thin horizontal strips of it swing side to side in a wave that
// rolls down the screen, wilder and faster with every gust, the screen
// rumbling and cash flying off each crest with a bang; then the wind drops
// and the frame snaps dead straight with a crack in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";

const KEY = "flag";
const REWARD = 4;
const BEHIND = "#0B0814";
const STRIPS = 30;
// strips swing up to SWING px; the wave has WAVES crests down the screen
const SWING = 110;
const WAVES = 2.2;
const SPEED: [number, number] = [0.008, 0.02];
const SNAP_MS = 220;
const CREST_COINS = 16;
const GUST_SHAKE: [number, number] = [0.6, 1.5];

export const forceFlagEvent = registerWispEvent(
  KEY,
  "Flag",
  () => CONFIG.flagEvent.chance,
  (floor, context, area) => {
    const { waveMs, gusts, holdMs, mergeMs } = CONFIG.flagEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const stripH = height / STRIPS;
    const centre: Point = { x: left + width / 2, y: top + height / 2 };
    const dir = Math.random() < 0.5 ? 1 : -1;
    // the wave's phase ms in: it speeds up as it grows
    const phase = (ms: number) => {
      const u = clamp01(ms / waveMs);
      return ms * lerp(SPEED, u * 0.5);
    };
    // it snaps straight over the last SNAP_MS, dead still for the blast
    const snapAt = waveMs - SNAP_MS;
    const swing = (ms: number) =>
      ms < snapAt
        ? SWING * easeIn(clamp01(ms / snapAt) * 0.85 + 0.15)
        : SWING *
          (1 - clamp01((ms - snapAt) / SNAP_MS)) *
          Math.cos(((ms - snapAt) / SNAP_MS) * Math.PI * 3);
    const offset = (i: number, ms: number) =>
      dir *
      swing(ms) *
      Math.sin((i / STRIPS) * WAVES * Math.PI * 2 - phase(ms));
    const gustAt = Array.from(
      { length: gusts },
      (_, k) => snapAt * ((k + 1) / (gusts + 1)) ** 0.8,
    );

    let shot: ScreenCopy | null = null;
    const gusting = createBeats(
      gustAt,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, gusts - 1);
        // the strip swung furthest out
        let best = 0;
        for (let i = 1; i < STRIPS; i++)
          if (Math.abs(offset(i, ms)) > Math.abs(offset(best, ms))) best = i;
        const at = {
          x: centre.x + offset(best, ms),
          y: top + (best + 0.5) * stripH,
        };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(
              at,
              CREST_COINS,
              [80, 260],
              -Math.PI / 2,
              Math.PI * 1.4,
            ),
            top + 40,
            area.bottom - 20,
          ),
        );
        // (no burst: it would be drawn under the strips)
        if (!cover!.isLive()) return;
        playSwoosh();
        playExplosion();
        shakeScreen(lerp(GUST_SHAKE, t));
      },
    );
    const snapping = createBeats(
      [waveMs],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: waveMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gusting.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= waveMs) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          for (let i = 0; i < STRIPS; i++) {
            const y = top + i * stripH;
            // a hair taller so no seams show between strips
            drawScreenPart(
              ctx,
              shot,
              left,
              y,
              width,
              stripH + 1,
              left + offset(i, ms),
              y,
              width,
              stripH + 1,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
