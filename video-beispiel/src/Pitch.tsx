// Pfefferminzia 2.0 – Beispiel-Launchvideo (60 s). Aufbau im Takt der Musik:
// 0–24 s Chaos im Posteingang · Drop: Enthüllung · fünf Bausteine je zwei Takte · Botschaft · Abspann.
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import {Approval, Chaos, Claim, EndCard, Evidence, Protocol, Reveal, Sorting, Window24h} from './scenes';
import {BAR, DROP, FPS, MUSIC_END, MUSIC_START_SECONDS} from './theme';

const TIMELINE = [
  {from: 0, length: DROP, scene: () => <Chaos />},
  {from: DROP, length: 2 * BAR, scene: () => <Reveal />},
  {from: DROP + 2 * BAR, length: 2 * BAR, scene: (at: number) => <Sorting at={at} />},
  {from: DROP + 4 * BAR, length: 2 * BAR, scene: (at: number) => <Evidence at={at} />},
  {from: DROP + 6 * BAR, length: 2 * BAR, scene: (at: number) => <Approval at={at} />},
  {from: DROP + 8 * BAR, length: 2 * BAR, scene: (at: number) => <Window24h at={at} />},
  {from: DROP + 10 * BAR, length: 2 * BAR, scene: (at: number) => <Protocol at={at} />},
  {from: DROP + 12 * BAR, length: 3 * BAR, scene: (at: number) => <Claim at={at} />},
  {from: DROP + 15 * BAR, length: 120, scene: (at: number) => <EndCard at={at} musicEndsAt={MUSIC_END} />},
];

export const Pitch: React.FC = () => (
  <AbsoluteFill style={{background: '#0b1f16'}}>
    <Audio
      src={staticFile('Audiio_Bigsby_BounceBack_Inst.flac')}
      trimBefore={Math.round(MUSIC_START_SECONDS * FPS)}
      volume={(f) => interpolate(f, [0, 10, MUSIC_END - 20, MUSIC_END], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
    />
    {TIMELINE.map(({from, length, scene}) => (
      <Sequence key={from} from={from} durationInFrames={length}>
        {scene(from)}
      </Sequence>
    ))}
  </AbsoluteFill>
);
