// the "Van de Graaff" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while a dome wisp rises out of the clicked
// floor's button to the middle of the screen and charges up, swelling, arcs
// crackling across its skin ever wilder as the screen hums; then it
// discharges, hurling long bolts at every empty spot on the floors in view
// one after another, each a blinding flash, a crack and a jolt as a new
// worker forms there; the last bolt lands in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "vanDeGraaff";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const RISE_MS = 300;
const ARCS = 4;
const SKIN: [number, number] = [36, 60];
const DOME: [number, number] = [0.8, 1.4];
const BOLT_MS = 200;
const HUM_MS = 90;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

export const forceVanDeGraaffEvent = registerWispEvent(
  KEY,
  "Van de Graaff",
  () => CONFIG.vanDeGraaffEvent.chance,
  (floor, context, area) => {
    const { chargeMs, gapsMs, holdMs, mergeMs } = CONFIG.vanDeGraaffEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const dome: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 - 40,
    };
    let clock = RISE_MS + chargeMs;
    const throws = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const at = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      return { hire, spot, at, bolt: createBolt(dome, spot, 2) };
    });
    const last = throws[throws.length - 1];
    const endAt = last.at;
    const skinEnds = Array.from({ length: ARCS * 2 }, () => ({ x: 0, y: 0 }));
    const skin: Bolt[] = Array.from({ length: ARCS }, (_, i) =>
      createBolt(skinEnds[i * 2], skinEnds[i * 2 + 1], 0),
    );
    const domeAt: Point = { x: 0, y: 0 };
    const domeWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / RISE_MS));
      domeAt.x = lerp([button.x, dome.x], u);
      domeAt.y = lerp([button.y, dome.y], u);
      return domeAt;
    };
    let lastHum = -Infinity;

    const throwing = createBeats(
      throws,
      (t) => t.at,
      (t, k) => {
        giveHire(t.hire);
        if (t === last) {
          cover!.blast(t.spot);
          return;
        }
        cover!.burst(t.spot, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, throws.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          throwing.tick(ms, now);
          const charging = ms > RISE_MS && ms < RISE_MS + chargeMs;
          if (charging && now - lastHum > HUM_MS && cover?.isLive()) {
            lastHum = now;
            shakeScreen(0.2 + 0.4 * ((ms - RISE_MS) / chargeMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + BOLT_MS) return;
          const charge = clamp01((ms - RISE_MS) / chargeMs);
          if (ms > RISE_MS && ms < endAt) {
            const r = lerp(SKIN, charge);
            for (let i = 0; i < ARCS; i++) {
              const a = Math.random() * Math.PI * 2;
              const b = a + 0.6 + Math.random() * 1.6;
              skinEnds[i * 2].x = dome.x + Math.cos(a) * r;
              skinEnds[i * 2].y = dome.y + Math.sin(a) * r;
              skinEnds[i * 2 + 1].x = dome.x + Math.cos(b) * r;
              skinEnds[i * 2 + 1].y = dome.y + Math.sin(b) * r;
              drawBolt(ctx, skin[i], 0.4 + 0.6 * charge, 0.35);
            }
          }
          for (const t of throws) {
            const f = (ms - t.at) / BOLT_MS;
            if (f < 0 || f >= 1) continue;
            drawBolt(ctx, t.bolt, 1 - f, 1.1);
            drawStrike(ctx, t.spot, 1 - f, 1, now);
          }
          drawWispBetween(
            ctx,
            domeWisp,
            ms,
            now,
            WISP_SIZE * lerp(DOME, charge),
            charge,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
