// Kamera, Untertitel und die vier Teile des Films.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {A, Cockpit, CursorKey, DETAIL_X, LIST_W, LIST_X, MintMark, T} from './cockpit';
import {BAR, BEAT, C, DROP, clamp, display, easeInOut, easeOut, ramp, text} from './theme';

// ------------------------------------------------------------------ Kamera
type Shot = {f: number; x: number; y: number; s: number; rx?: number; rz?: number; cut?: boolean};

const cameraAt = (f: number, shots: Shot[]) => {
  let a = shots[0];
  for (let i = 1; i < shots.length; i++) {
    const b = shots[i];
    if (f < b.f) {
      if (b.cut) return a; // harter Schnitt: bis zum Schnitt stehen bleiben
      const t = interpolate(f, [a.f, b.f], [0, 1], {...clamp, easing: easeInOut});
      const mix = (p: number, q: number) => p + (q - p) * t;
      return {f, x: mix(a.x, b.x), y: mix(a.y, b.y), s: mix(a.s, b.s), rx: mix(a.rx ?? 0, b.rx ?? 0), rz: mix(a.rz ?? 0, b.rz ?? 0)};
    }
    a = b;
  }
  return a;
};

/** Fährt durch die Oberfläche; je näher, desto stärker verschwimmt der Rand (Tiefenschärfe). */
const Camera: React.FC<{shots: Shot[]; children: React.ReactNode; f: number}> = ({shots, children, f}) => {
  const raw = cameraAt(f, shots);
  // Nie über den Rand der Oberfläche hinausschauen, solange die Kamera gerade und nah ist.
  const c = {...raw};
  if (!raw.rx && !raw.rz && raw.s >= 1) {
    c.x = Math.min(Math.max(raw.x, 960 / raw.s), 1920 - 960 / raw.s);
    c.y = Math.min(Math.max(raw.y, 540 / raw.s), 1080 - 540 / raw.s);
  }
  const blur = interpolate(c.s, [1.3, 2.8], [0, 7], clamp);
  return (
    <AbsoluteFill style={{perspective: 2200, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `rotateX(${c.rx ?? 0}deg) rotateZ(${c.rz ?? 0}deg)`}}>
        <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 - c.x * c.s}px, ${540 - c.y * c.s}px) scale(${c.s})`}}>
          {children}
        </div>
      </AbsoluteFill>
      {blur > 0.2 ? (
        <AbsoluteFill
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitMaskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, transparent 55%, black 100%)',
            maskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, transparent 55%, black 100%)',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ Untertitel: ruhig, immer an derselben Stelle
const Caption: React.FC<{f: number; from: number; to: number; top?: boolean; sub?: string; children: React.ReactNode}> = ({f, from, to, top, sub, children}) => {
  if (f < from || f > to) return null;
  const inT = ramp(f, from, from + 12);
  const outT = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 110, ...(top ? {top: 90} : {bottom: 100}), overflow: 'hidden', opacity: outT}}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 22, padding: '18px 34px 18px 24px', borderRadius: 18,
          background: 'rgba(7,20,14,.93)', transform: `translateY(${(1 - inT) * 110}%)`,
        }}
      >
        <div style={{width: 6, alignSelf: 'stretch', borderRadius: 3, background: C.mint}} />
        <div>
          <div style={{fontFamily: display, fontWeight: 800, fontSize: 56, letterSpacing: -1.5, color: '#fff'}}>{children}</div>
          {sub ? <div style={{fontFamily: text, fontWeight: 500, fontSize: 27, color: 'rgba(255,255,255,.78)', marginTop: 4}}>{sub}</div> : null}
        </div>
      </div>
    </div>
  );
};

const listX = LIST_X + LIST_W / 2;

// ------------------------------------------------------------------ Teil 1: Pfefferminzia 1.0 – grau und zu viel
const ACT1: Shot[] = [
  {f: 0, x: listX, y: 190, s: 2.5},
  {f: 250, x: listX, y: 430, s: 1.55},
  {f: 256, x: A.inboxBadge.x - 30, y: A.inboxBadge.y, s: 3.4, cut: true},
  {f: 318, x: A.inboxBadge.x - 30, y: A.inboxBadge.y, s: 3.7},
  {f: 320, x: A.body.x, y: A.body.y, s: 2.3, cut: true},
  {f: 382, x: A.body.x + 60, y: A.body.y, s: 2.45},
  {f: 384, x: A.sheets.x, y: A.sheets.y, s: 2.0, cut: true},
  {f: 446, x: A.sheets.x + 40, y: A.sheets.y, s: 2.1},
  {f: 448, x: A.sendOld.x - 80, y: A.sendOld.y - 40, s: 2.6, cut: true},
  {f: 510, x: A.sendOld.x - 70, y: A.sendOld.y - 40, s: 2.8},
  {f: 512, x: 960, y: 540, s: 1.12, cut: true},
  {f: 576, x: 960, y: 540, s: 1.0},
  {f: 704, x: 960, y: 560, s: 0.6, rx: 30, rz: -5},
];

const ACT1_CURSOR: CursorKey[][] = [
  [
    {f: 392, x: DETAIL_X + 330, y: 560},
    {f: 408, x: DETAIL_X + 228, y: 470},
    {f: 424, x: DETAIL_X + 555, y: 470},
    {f: 440, x: DETAIL_X + 882, y: 470},
  ],
  [
    {f: 452, x: DETAIL_X + 820, y: 1060},
    {f: 470, x: DETAIL_X + 965, y: 1004},
    {f: 488, x: DETAIL_X + 880, y: 1040},
    {f: 506, x: DETAIL_X + 968, y: 1006},
  ],
];

export const Before: React.FC = () => {
  const f = useCurrentFrame();
  const fadeIn = interpolate(f, [0, 14], [0, 1], clamp);
  const fadeOut = interpolate(f, [676, 704], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.night}}>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut, filter: 'grayscale(1) contrast(.92) brightness(.96)'}}>
        <Camera shots={ACT1} f={f}>
          <Cockpit f={f} modern={false} cursor={ACT1_CURSOR} />
        </Camera>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(7,20,14,.55) 100%)'}} />
      <Caption f={f} from={256} to={376}>Jeden Morgen. Jede Mail von Hand.</Caption>
      <Caption f={f} from={384} to={504}>Welcher Vertrag? Welcher Tarif?</Caption>
      <Caption f={f} from={512} to={640}>Und wer entscheidet?</Caption>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ Teil 2: der Drop
export const Reveal: React.FC = () => {
  const f = useCurrentFrame(); // 0 = Drop
  const wipe = interpolate(f, [0, 10], [0, 1], {...clamp, easing: easeOut});
  const draw = ramp(f, 4, 28);
  const fill = ramp(f, BEAT, BEAT + 8);
  const word = ramp(f, BEAT, BEAT + 14);
  const two = ramp(f, BAR, BAR + 12);
  const out = interpolate(f, [2 * BAR - 8, 2 * BAR], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <AbsoluteFill style={{background: C.mint, transform: `translateX(${wipe * 100}%)`}} />
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: out, transform: `scale(${1 + (1 - out) * 0.04})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 40}}>
          <MintMark size={200} draw={draw} fill={fill} />
          <div style={{overflow: 'hidden', paddingBottom: 12}}>
            <div style={{fontFamily: display, fontWeight: 900, fontSize: 180, letterSpacing: -7, color: C.forest, transform: `translateY(${(1 - word) * 110}%)`, display: 'flex'}}>
              Pfefferminzia
              <span style={{display: 'inline-block', overflow: 'hidden', marginLeft: 36}}>
                <span style={{display: 'inline-block', color: C.mint, transform: `translateY(${(1 - two) * 110}%)`}}>2.0</span>
              </span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ Teil 3: die Tour durch Pfefferminzia 2.0
const S = DROP + 2 * BAR; // 848
const TOUR: Shot[] = [
  {f: S, x: 480, y: 270, s: 2.0},
  {f: T.select - 4, x: listX, y: 360, s: 1.85},
  {f: S + 2 * BAR, x: A.evidence.x, y: 380, s: 1.42},
  {f: T.click - 44, x: A.evidence.x, y: 420, s: 1.48},
  {f: T.click - 32, x: A.decision.x, y: A.decision.y, s: 1.7},
  {f: T.attach - 16, x: A.decision.x, y: A.decision.y + 10, s: 1.76},
  {f: T.attach, x: A.reply.x, y: 900, s: 1.55},
  {f: T.queue - 1, x: A.reply.x, y: 905, s: 1.6},
  {f: T.queue, x: A.queue.x, y: 480, s: 1.22, cut: true},
  {f: T.stop - 26, x: A.queue.x, y: 470, s: 1.3},
  {f: T.stop, x: DETAIL_X + 720, y: 360, s: 1.62},
  {f: T.log - 1, x: DETAIL_X + 720, y: 365, s: 1.66},
  {f: T.log, x: A.log.x, y: 380, s: 1.24, cut: true},
  {f: T.log + 2 * BAR - 1, x: A.log.x, y: 450, s: 1.36},
];

const TOUR_CURSOR: CursorKey[][] = [
  [
    {f: T.click - 26, x: DETAIL_X + 620, y: 930},
    {f: T.click - 4, x: A.approveButton.x, y: A.approveButton.y},
    {f: T.click, x: A.approveButton.x, y: A.approveButton.y, click: true},
    {f: T.click + 30, x: A.approveButton.x + 60, y: A.approveButton.y + 70},
  ],
  [
    {f: T.queue + 18, x: DETAIL_X + 640, y: 560},
    {f: T.stop - 4, x: A.stopButton.x, y: A.stopButton.y},
    {f: T.stop, x: A.stopButton.x, y: A.stopButton.y, click: true},
    {f: T.stop + 30, x: A.stopButton.x + 40, y: A.stopButton.y + 70},
  ],
];

export const Tour: React.FC = () => {
  const local = useCurrentFrame();
  const f = local + S; // Oberfläche und Kamera laufen in Videobildern
  const fadeIn = interpolate(local, [0, 6], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.paper, opacity: fadeIn}}>
      <Camera shots={TOUR} f={f}>
        <Cockpit f={f} modern cursor={TOUR_CURSOR} />
      </Camera>
      <Caption f={f} from={S + BEAT} to={S + 2 * BAR - 12} sub="Jede neue Mail landet automatisch bei Leben oder Haftpflicht.">Sortiert sich selbst.</Caption>
      <Caption f={f} from={S + 2 * BAR + 8} to={S + 4 * BAR - 12} sub="Vertrag, Tarif und Leistungsakte – aus dem Bestand, nicht aus der Mail.">Claude sucht die Belege.</Caption>
      <Caption f={f} from={T.click - 24} to={T.queue - 10} top sub="Ohne deine Freigabe geht keine Leistungsentscheidung raus.">Claude schlägt vor. Du gibst frei.</Caption>
      <Caption f={f} from={T.queue + 8} to={T.log - 10} top sub="Claudes Antwort geht nach 24 Stunden von selbst raus. Bis dahin kannst du sie anhalten.">Einfache Fälle: automatisch.</Caption>
      <Caption f={f} from={T.log + 8} to={T.log + 2 * BAR - 6} sub="Wer hat was getan – Claude oder ein Mensch.">Alles im Protokoll.</Caption>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ Teil 4: die Botschaft und der Abspann
const FINALE: Shot[] = [
  {f: 0, x: 960, y: 540, s: 0.86, rx: 16, rz: -4},
  {f: 3 * BAR, x: 960, y: 590, s: 0.66, rx: 30, rz: -8},
];

const BigLine: React.FC<{f: number; from: number; to: number; children: React.ReactNode}> = ({f, from, to, children}) => {
  // Beide Zeilen haben von Anfang an ihren Platz – so springt nichts, wenn die zweite dazukommt.
  const inT = ramp(f, from, from + 14);
  const outT = interpolate(f, [to - 8, to], [1, 0], clamp);
  return (
    <div style={{overflow: 'hidden', opacity: f < from ? 0 : outT, paddingBottom: 10}}>
      <div style={{fontFamily: display, fontWeight: 900, fontSize: 128, letterSpacing: -4, color: '#fff', transform: `translateY(${(1 - inT) * 110}%)`}}>
        {children}
      </div>
    </div>
  );
};

export const Finale: React.FC = () => {
  const f = useCurrentFrame(); // 0 = Beginn der Botschaft (Takt 13 nach dem Drop)
  const tourEnd = T.log + 2 * BAR;
  const bgIn = interpolate(f, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.night}}>
      <AbsoluteFill style={{opacity: 0.55 * bgIn}}>
        <Camera shots={FINALE} f={f}>
          <div style={{boxShadow: '0 60px 160px rgba(82,185,134,.35)', borderRadius: 24, overflow: 'hidden'}}>
            <Cockpit f={tourEnd - 20} modern />
          </div>
        </Camera>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(7,20,14,.92) 0%, rgba(7,20,14,.55) 55%, rgba(7,20,14,.2) 100%)'}} />
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 150}}>
        <BigLine f={f} from={8} to={3 * BAR}>Der Agent bereitet vor.</BigLine>
        <BigLine f={f} from={BAR + 8 + BEAT} to={3 * BAR}>
          <span style={{color: C.mint}}>Du</span> entscheidest.
        </BigLine>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 0, 16);
  const small = ramp(f, 24, 40);
  const out = interpolate(f, [96, 120], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.night, opacity: out}}>
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 34, opacity: t, transform: `translateY(${(1 - t) * 30}px)`}}>
          <MintMark size={150} />
          <div style={{fontFamily: display, fontWeight: 900, fontSize: 130, letterSpacing: -5, color: '#fff'}}>
            Pfefferminzia <span style={{color: C.mint}}>2.0</span>
          </div>
        </div>
        <div style={{position: 'absolute', bottom: 70, fontFamily: text, fontSize: 22, color: 'rgba(255,255,255,.55)', opacity: small}}>
          Gebaut an einem Workshop-Tag mit Claude · Prototyp mit erfundenen Fällen
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
