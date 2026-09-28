// Bewegung im Takt: Hintergrund, Überschriften, Hervorheben einer Komponente.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BEAT, C, display} from '../theme';

/** Heller Markenhintergrund mit Raster und Minz-Ringen, die auf jedem Schlag pulsieren. */
export const Backdrop: React.FC<{pulse: number; dark?: boolean}> = ({pulse, dark}) => (
  <AbsoluteFill style={{background: dark ? C.night : C.paper, overflow: 'hidden'}}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${dark ? 'rgba(82,185,134,.07)' : 'rgba(23,61,44,.05)'} 1px, transparent 1px),
          linear-gradient(90deg, ${dark ? 'rgba(82,185,134,.07)' : 'rgba(23,61,44,.05)'} 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }}
    />
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          position: 'absolute', right: -380 + i * 60, top: -380 + i * 60, width: 1100 - i * 120, height: 1100 - i * 120,
          borderRadius: '50%', border: `${2 + pulse * 3}px solid ${C.mint}`, opacity: 0.12 + pulse * 0.25 - i * 0.03,
          transform: `scale(${1 + pulse * 0.025 * (i + 1)})`,
        }}
      />
    ))}
    <div
      style={{
        position: 'absolute', left: -300, bottom: -420, width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, ${dark ? 'rgba(82,185,134,.25)' : 'rgba(82,185,134,.22)'}, transparent 70%)`,
      }}
    />
  </AbsoluteFill>
);

/** Überschrift, deren Wörter auf aufeinanderfolgenden Schlägen einspringen. */
export const BeatHeadline: React.FC<{
  words: string[]; startBeat?: number; size?: number; color?: string; accent?: number; style?: React.CSSProperties;
}> = ({words, startBeat = 0, size = 120, color = C.forest, accent = -1, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{fontFamily: display, fontWeight: 900, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.03, color, ...style}}>
      {words.map((word, i) => {
        const s = spring({frame: frame - (startBeat + i) * BEAT, fps, config: {damping: 14, stiffness: 180}});
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', marginRight: size * 0.25, opacity: s,
              transform: `translateY(${(1 - s) * size * 0.6}px) scale(${interpolate(s, [0, 1], [0.7, 1])})`,
              color: i === accent ? C.mint : color,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Hebt eine Komponente hervor: Sie fährt ein, wächst auf jedem Schlag kurz an
 * und bekommt einen Minz-Rahmen, sobald `focus` gesetzt ist.
 */
export const Spotlight: React.FC<{children: React.ReactNode; pulse: number; focus?: number; enterDelay?: number; tilt?: number}> = ({
  children, pulse, focus = 0, enterDelay = 0, tilt = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - enterDelay, fps, config: {damping: 16, stiffness: 120}});
  return (
    <div
      style={{
        position: 'relative', opacity: enter,
        transform: `perspective(1600px) translateY(${(1 - enter) * 160}px) rotateY(${(1 - enter) * tilt}deg) scale(${
          0.92 + enter * 0.08 + pulse * 0.012 + focus * 0.04
        })`,
      }}
    >
      <div
        style={{
          position: 'absolute', inset: -18, borderRadius: 40, border: `4px solid ${C.mint}`,
          opacity: focus, boxShadow: `0 0 ${60 + pulse * 40}px rgba(82,185,134,${0.35 * focus})`,
        }}
      />
      {children}
    </div>
  );
};
