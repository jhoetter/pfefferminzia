// Pfefferminzia 2.0 – Beispiel-Launchvideo (60 s), geschnitten auf „Bounce Back“ (112,5 BPM).
//   0–24 s   Pfefferminzia 1.0: grau, die Post stapelt sich, harte Schnitte auf jedem Takt
//   Drop     Farbe. Das Logo zeichnet sich, „2.0“ auf dem nächsten Takt
//   28–50 s  Kamerafahrt durch die Kommandozentrale: sortieren, belegen, freigeben, stoppen, protokollieren
//   50–56 s  Die Botschaft · danach Abspann
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import {T} from './cockpit';
import {Before, EndCard, Finale, Reveal, Tour} from './film';
import {BAR, DROP, FPS, MUSIC_END, MUSIC_START_SECONDS, clamp} from './theme';

const TOUR_START = DROP + 2 * BAR;
const FINALE_START = T.log + 2 * BAR;
const END_START = FINALE_START + 3 * BAR;

export const Pitch: React.FC = () => (
  <AbsoluteFill style={{background: '#07140e'}}>
    <Audio
      src={staticFile('Audiio_Bigsby_BounceBack_Inst.flac')}
      trimBefore={Math.round(MUSIC_START_SECONDS * FPS)}
      volume={(f) => interpolate(f, [0, 10, MUSIC_END - 20, MUSIC_END], [0, 1, 1, 0], clamp)}
    />
    <Sequence durationInFrames={DROP}><Before /></Sequence>
    <Sequence from={DROP} durationInFrames={2 * BAR}><Reveal /></Sequence>
    <Sequence from={TOUR_START} durationInFrames={FINALE_START - TOUR_START}><Tour /></Sequence>
    <Sequence from={FINALE_START} durationInFrames={3 * BAR}><Finale /></Sequence>
    <Sequence from={END_START} durationInFrames={120}><EndCard /></Sequence>
  </AbsoluteFill>
);
