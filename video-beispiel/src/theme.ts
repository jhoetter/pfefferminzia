import {loadFont as loadDisplay} from '@remotion/google-fonts/InterTight';
import {loadFont as loadText} from '@remotion/google-fonts/Inter';
import {Easing, interpolate} from 'remotion';

export const display = loadDisplay('normal', {weights: ['700', '800', '900'], subsets: ['latin']}).fontFamily;
export const text = loadText('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']}).fontFamily;

// Pfefferminzia-Marke
export const C = {
  forest: '#173d2c',
  night: '#07140e',
  mint: '#52b986',
  mintSoft: '#e3f4ea',
  paper: '#fbfbfa',
  sidebar: '#f4f4f2',
  ink: '#1c1d1f',
  muted: '#6f7277',
  faint: '#a1a4a8',
  line: '#e6e6e2',
  violet: '#6d4ed8',
  violetSoft: '#f1edfd',
  amber: '#b98900',
  amberSoft: '#fbf3dc',
  red: '#c9483b',
  redSoft: '#f9e4e1',
};

// Musik: „Bounce Back“ (Bigsby), 112,5 BPM → ein Schlag = 16 Bilder bei 30 fps, ein Takt = 64.
// Der Track startet bei 51,19 s; so liegt der Drop (75,19 s) genau auf Bild 720.
export const FPS = 30;
export const BEAT = 16;
export const BAR = 64;
export const DROP = 720;
export const MUSIC_START_SECONDS = 51.19;
export const MUSIC_END = 1770; // Der Track endet hart bei 110,2 s.
export const DURATION = 1800;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 zwischen zwei Bildern, weich. */
export const ramp = (frame: number, from: number, to: number, easing = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {...clamp, easing});
