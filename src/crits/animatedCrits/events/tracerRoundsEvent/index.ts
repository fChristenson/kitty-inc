// the "Tracer Rounds" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while two gun wisps fly out of the
// clicked floor's button to the bottom corners of the screen and open up in
// crossfire, long streaking tracers criss-crossing the screen into the
// income bars from both sides, every hit a pop and a jolt as free levels
// land, the bursts ever thicker, until both guns pour one last crossing
// stream into the top bar in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "tracerRounds";
const MAX_BARS = 4;
const EDGE = 60;
const SETUP_MS = 240;
const SHOTS = 24;
const FINAL = 6;
const SPEED = 2.4;
const FLASH_MS = 70;
const GUN = 0.5;
const TRACER = WISP_SIZE * 0.26;
const BANG_GAP_MS = 60;

export const forceTracerRoundsEvent = registerWispEvent(
  KEY,
  "Tracer Rounds",
  () => CONFIG.tracerRoundsEvent.chance,
  (floor, context, area) => {
    const { fireMs, levelShare, holdMs, mergeMs } = CONFIG.tracerRoundsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const posts: Point[] = [
      { x: area.left + EDGE, y: area.bottom - EDGE },
      { x: area.right - EDGE, y: area.bottom - EDGE },
    ];
    const guns = posts.map((post) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01(ms / SETUP_MS));
        at.x = lerp([button.x, post.x], u);
        at.y = lerp([button.y, post.y], u);
        return at;
      };
    });
    // each gun aims at the far side of a bar, so the streams cross
    const shots: {
      bullet: Bullet;
      bar: (typeof bars)[number];
      final: boolean;
    }[] = [];
    for (let i = 0; i < SHOTS; i++) {
      const g = i % 2;
      const bar = bars[Math.floor(i / 2) % bars.length];
      const u =
        g === 0 ? 0.65 + 0.3 * Math.random() : 0.05 + 0.3 * Math.random();
      const to: Point = { x: bar.box.x + bar.box.width * u, y: bar.center.y };
      const fires = SETUP_MS + fireMs * Math.sqrt(i / SHOTS);
      shots.push({
        bullet: aimBullet(posts[g], to, fires, SPEED),
        bar,
        final: false,
      });
    }
    const finalAt = SETUP_MS + fireMs + 60;
    const top = bars[0];
    for (let i = 0; i < FINAL; i++) {
      const g = i % 2;
      const to: Point = {
        x: top.box.x + top.box.width * (g === 0 ? 0.8 : 0.2),
        y: top.center.y,
      };
      shots.push({
        bullet: aimBullet(
          posts[g],
          to,
          finalAt + Math.floor(i / 2) * 40,
          SPEED,
        ),
        bar: top,
        final: true,
      });
    }
    const bullets = shots.map((s) => s.bullet);
    const endAt = Math.max(...bullets.map((b) => b.hitAt));
    let lastBang = -Infinity;

    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 1),
          s.bullet.from,
        );
        cover!.burst(s.bullet.to, s.final ? 0.6 : 0.25);
        if (!cover!.isLive() || s.bullet.hitAt - lastBang < BANG_GAP_MS) return;
        lastBang = s.bullet.hitAt;
        playBloop();
        shakeScreen(lerp([0.3, 1], k / shots.length));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(top.center);
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
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, TRACER, true);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, 46);
          }
          for (const gun of guns)
            drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
