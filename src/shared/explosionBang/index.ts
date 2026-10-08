// every explosion's bang: its sound and, on phones, a buzz as long as it. An
// explosion never plays without its buzz, so play them only through here
import {
  getExplosionDurationMs,
  playBarExplosionSound,
  playCritExplosionSound,
  playExplosionSound,
  playSlamExplosionSound,
} from "../../sound";
import { buzz } from "../vibration";

// the explosion file's audible length overshoots the felt bang by this much
const BUZZ_TRIM_MS = 200;

function buzzWithBang(played: boolean): void {
  if (played) buzz(getExplosionDurationMs() - BUZZ_TRIM_MS);
}

// a blast; back-to-back ones within a few ms play once
export function playExplosion(): void {
  buzzWithBang(playExplosionSound());
}

// a crit's number hitting a bar; rate shifts its pitch
export function playBarExplosion(rate = 1): void {
  buzzWithBang(playBarExplosionSound(rate));
}

// a slam's impact, never debounced away by the bangs just before it
export function playSlamExplosion(): void {
  buzzWithBang(playSlamExplosionSound());
}

// a crit's own bang, cutting the last one short instead of stacking on it
export function playCritExplosion(): void {
  buzzWithBang(playCritExplosionSound());
}
