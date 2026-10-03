// the "Cheer Squad" event (experiment: a cheerleading squad; worker perma
// tiers): it covers its crit, whose click freezes the screen while a line
// of pom-pom wisps, each a wisp in a burst of glitter, jumps and kicks
// across the bottom of the screen, chanting one beat after another: "GIVE
// ME A K!", "I!", "T!", "T!", "Y!", every letter a jump, a flash and a jolt
// as a beam of cheer lifts one worker a perma tier; then "WHAT DOES IT
// SPELL?", "KITTY!", and the squad tosses its flyer sky-high, landing back
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { drawBeam } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { findRewardWorkers } from "../eventRewards";
import { COLOR } from "../../palette";

const KEY = "cheerSquad";
const MAX_WORKERS = 5;
const CHANTS = ["GIVE ME A K!", "I!", "T!", "T!", "Y!"];
const SQUAD = 5;
const FLYER = 2;
const INSET = 0.14;
const LINE_UP = 170;
const INTRO_MS = 160;
const JUMP_MS = 230;
const HOP = 45;
const LEAP = 140;
const KICK = 16;
const SPELL_GAP_MS = 240;
const KITTY_GAP_MS = 260;
const TOSS_TOP = 200;
const POMS = 6;
const POM_REACH = 30;
const POM = 7;
const BEAM_MS = 240;
const BEAM_WIDTH = 18;
const CALL_MS = 300;
const CHANT_STYLE = { fontSize: 66, strokeWidth: 10 };
const KITTY_STYLE = { fontSize: 96, strokeWidth: 14 };
const CHEER = 0.42;
const BEAT_SHAKE: [number, number] = [0.6, 1.2];

export const forceCheerSquadEvent = registerWispEvent(
  KEY,
  "Cheer Squad",
  () => CONFIG.cheerSquadEvent.chance,
  (floor, context, area) => {
    const { beatsMs, tossMs, holdMs, mergeMs } = CONFIG.cheerSquadEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const width = area.right - area.left;
    const lineY = area.bottom - LINE_UP;
    const textAt: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 - 120,
    };
    let clock: number = INTRO_MS;
    const beats = CHANTS.map((label, k) => {
      const at = clock;
      clock += lerp(beatsMs, k / (CHANTS.length - 1));
      return {
        at,
        k,
        worker: workers[k] ?? null,
        sprite: createCritTextSprite(label, COLOR.heavenlyGold, CHANT_STYLE),
      };
    });
    const spell = beats[beats.length - 1].at + SPELL_GAP_MS;
    const kitty = spell + KITTY_GAP_MS;
    const lands = kitty + tossMs;
    const endAt = lands;
    const spellText = createCritTextSprite(
      "WHAT DOES IT SPELL?",
      COLOR.heavenlyGold,
      CHANT_STYLE,
    );
    const kittyText = createCritTextSprite(
      "KITTY!",
      COLOR.heavenlyGold,
      KITTY_STYLE,
    );
    // every jump the squad makes: one per chant, and the big one on KITTY
    const jumps = [
      ...beats.map((b) => ({ at: b.at, k: b.k })),
      { at: kitty, k: -1 },
    ];
    const squad = Array.from({ length: SQUAD }, (_, i) => {
      const home: Point = {
        x: area.left + width * lerp([INSET, 1 - INSET], i / (SQUAD - 1)),
        y: lineY,
      };
      const at: Point = { x: 0, y: 0 };
      const flyer = i === FLYER;
      return {
        home,
        at: (ms: number): Point => {
          at.x = home.x;
          at.y = home.y;
          if (flyer && ms >= kitty) {
            // tossed sky-high, then dropping back down
            const u = clamp01((ms - kitty) / tossMs);
            const top = area.top + TOSS_TOP;
            at.y =
              u < 0.55
                ? lerp([home.y, top], easeOut(u / 0.55))
                : lerp([top, home.y], easeIn((u - 0.55) / 0.45));
            return at;
          }
          for (const j of jumps) {
            const t = (ms - (j.at - JUMP_MS / 2)) / JUMP_MS;
            if (t <= 0 || t >= 1) continue;
            const arc = Math.sin(t * Math.PI);
            const own = j.k === i || j.k < 0;
            at.y -= arc * (own ? LEAP : HOP);
            at.x += arc * KICK * (i % 2 === 0 ? 1 : -1);
          }
          return at;
        },
      };
    });

    const chanting = createBeats(
      beats,
      (b) => b.at,
      (b) => {
        const t = b.k / (beats.length - 1);
        if (b.worker) {
          cover!.promote(b.worker);
          cover!.burst(b.worker.at, 0.6);
        }
        cover!.burst(squad[b.k].home, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BEAT_SHAKE, t));
      },
    );
    const spelling = createBeats(
      [spell, kitty],
      (ms) => ms,
      (ms) => {
        if (!cover?.isLive()) return;
        if (ms === kitty) {
          cover.burst(squad[FLYER].home, 0.8);
          playExplosion();
          shakeScreen(1);
        } else {
          playBloop();
          shakeScreen(0.5);
        }
      },
    );
    const landing = createBeats(
      [lands],
      (ms) => ms,
      () => cover!.blast(squad[FLYER].home),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          chanting.tick(ms, now);
          spelling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS * 2) return;
          for (const b of beats) {
            const c = (ms - b.at) / CALL_MS;
            if (c >= 0 && c < 1) {
              ctx.globalAlpha = 1 - c * c;
              drawCritTextSprite(
                ctx,
                b.sprite,
                textAt.x,
                textAt.y,
                1 + 0.5 * (1 - clamp01(c * 3)),
              );
              ctx.globalAlpha = 1;
            }
            const beam = (ms - b.at) / BEAM_MS;
            if (b.worker && beam >= 0 && beam < 1)
              drawBeam(
                ctx,
                squad[b.k].home,
                b.worker.at,
                BEAM_WIDTH * (1 - beam),
                1 - beam,
              );
          }
          const s = (ms - spell) / CALL_MS;
          if (s >= 0 && ms < kitty)
            drawCritTextSprite(
              ctx,
              spellText,
              textAt.x,
              textAt.y,
              1 + 0.4 * (1 - clamp01(s * 3)),
            );
          const k = (ms - kitty) / (CALL_MS * 2);
          if (k >= 0 && k < 1) {
            ctx.globalAlpha = 1 - clamp01((ms - lands) / CALL_MS);
            drawCritTextSprite(
              ctx,
              kittyText,
              textAt.x,
              textAt.y,
              1 + 0.6 * (1 - clamp01(k * 4)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms > endAt) return;
          const show = clamp01(ms / INTRO_MS);
          for (let i = 0; i < SQUAD; i++) {
            const m = squad[i];
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * CHEER * show,
              0.6,
              0,
              endAt,
            );
            // the pom-poms: glitter whirling round each cheerleader
            const p = m.at(ms);
            for (let j = 0; j < POMS; j++) {
              const a =
                now * 0.012 * (i % 2 === 0 ? 1 : -1) + (j / POMS) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                p.x + Math.cos(a) * POM_REACH,
                p.y + Math.sin(a) * POM_REACH * 0.7,
                POM,
                i * POMS + j,
                show,
                now,
              );
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
