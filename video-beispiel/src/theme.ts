import {loadFont as loadDisplay} from '@remotion/google-fonts/InterTight';
import {loadFont as loadText} from '@remotion/google-fonts/Inter';

export const display = loadDisplay('normal', {weights: ['600', '800', '900'], subsets: ['latin']}).fontFamily;
export const text = loadText('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']}).fontFamily;

// Pfefferminzia-Marke
export const C = {
  forest: '#173d2c',
  night: '#0b1f16',
  mint: '#52b986',
  mintSoft: '#d9f1e1',
  paper: '#f6faf7',
  ink: '#1c1d1f',
  muted: '#6f7277',
  line: '#e3e8e4',
  violet: '#6d4ed8',
  violetSoft: '#efeafd',
  amber: '#d9a100',
  red: '#c9483b',
};

// Musik: „Bounce Back“ (Bigsby), 112,5 BPM → ein Schlag = 16 Bilder bei 30 fps.
// Wir starten den Track bei 51,19 s; der Drop (75,19 s) liegt damit genau auf Bild 720.
export const FPS = 30;
export const BEAT = 16;
export const BAR = BEAT * 4;
export const DROP = 720;
export const MUSIC_START_SECONDS = 51.19;
export const MUSIC_END = 1770; // Der Track endet hart bei 110,2 s.
export const DURATION = 1800;

/** 1 genau auf einem Schlag, danach schnell abklingend – für Pulse im Takt. */
export const beatPulse = (frame: number, from = DROP) => {
  if (frame < from) return 0;
  const phase = (frame - from) % BEAT;
  return Math.exp(-phase / 3.2);
};
