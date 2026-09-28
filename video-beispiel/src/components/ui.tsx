// Die Bausteine der Kommandozentrale – als echte React-Komponenten nachgebaut.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, display, text} from '../theme';

export const Logo: React.FC<{size?: number; dark?: boolean}> = ({size = 120, dark = false}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="18" fill={dark ? C.night : C.forest} />
    <path d="M14 18h36v22c0 7-8 11-18 17-10-6-18-10-18-17V18Z" fill={C.mintSoft} />
    <path
      d="M32 46V25M32 39c-7 0-12-5-12-12 7 0 12 5 12 12Zm0-7c0-7 5-12 12-12 0 7-5 12-12 12Z"
      fill={C.mint} stroke={C.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

/** Fensterrahmen im Stil des Cockpits. */
export const Window: React.FC<{title: string; width: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  title, width, children, style,
}) => (
  <div
    style={{
      width, background: '#fff', borderRadius: 28, overflow: 'hidden', fontFamily: text,
      boxShadow: '0 2px 4px rgba(0,0,0,.05), 0 40px 90px rgba(23,61,44,.18)', border: `1px solid ${C.line}`, ...style,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '20px 28px', borderBottom: `1px solid ${C.line}`, background: '#fbfbfa'}}>
      {['#e4e4e1', '#e4e4e1', '#e4e4e1'].map((color, i) => (
        <div key={i} style={{width: 14, height: 14, borderRadius: 7, background: color}} />
      ))}
      <div style={{marginLeft: 12, fontSize: 22, fontWeight: 600, color: C.muted}}>{title}</div>
    </div>
    <div style={{padding: 32}}>{children}</div>
  </div>
);

export const Badge: React.FC<{label: string; tone: 'mint' | 'violet' | 'amber' | 'grey' | 'red'; style?: React.CSSProperties}> = ({
  label, tone, style,
}) => {
  const tones = {
    mint: [C.mintSoft, C.forest], violet: [C.violetSoft, C.violet], amber: ['#fbf1d4', '#8a6500'],
    grey: ['#efefec', C.muted], red: ['#f8e1de', C.red],
  } as const;
  const [bg, fg] = tones[tone];
  return (
    <span style={{display: 'inline-block', padding: '6px 16px', borderRadius: 999, background: bg, color: fg, fontSize: 20, fontWeight: 700, ...style}}>
      {label}
    </span>
  );
};

export type Mail = {id: string; from: string; subject: string; line?: 'Leben' | 'Haftpflicht'};

export const MailRow: React.FC<{mail: Mail; showLine?: number; highlight?: boolean}> = ({mail, showLine = 0, highlight}) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 22, padding: '20px 24px', borderRadius: 18, fontFamily: text,
      background: highlight ? C.mintSoft : '#fff', border: `1px solid ${highlight ? C.mint : C.line}`,
    }}
  >
    <div style={{width: 14, height: 14, borderRadius: 7, background: C.mint, flex: 'none'}} />
    <div style={{width: 110, fontSize: 20, color: C.muted, fontWeight: 600}}>{mail.id}</div>
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{fontSize: 24, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{mail.subject}</div>
      <div style={{fontSize: 19, color: C.muted}}>{mail.from}</div>
    </div>
    {mail.line && showLine > 0 ? (
      <div style={{transform: `scale(${showLine})`, transformOrigin: 'right center'}}>
        <Badge label={mail.line} tone={mail.line === 'Leben' ? 'violet' : 'mint'} />
      </div>
    ) : null}
  </div>
);

export const Field: React.FC<{label: string; value: string; strong?: boolean; appear: number}> = ({label, value, strong, appear}) => (
  <div
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 4px',
      borderBottom: `1px solid ${C.line}`, opacity: appear, transform: `translateX(${(1 - appear) * 40}px)`,
    }}
  >
    <span style={{fontSize: 22, color: C.muted}}>{label}</span>
    <span style={{fontSize: 27, fontWeight: strong ? 800 : 600, color: strong ? C.forest : C.ink}}>{value}</span>
  </div>
);

/** Leistungsentscheidung – die violette Karte aus Drill 8. */
export const DecisionCard: React.FC<{approved: number; pressed: number}> = ({approved, pressed}) => (
  <div style={{position: 'relative', background: C.violetSoft, border: `2px solid ${C.violet}`, borderRadius: 24, padding: 34, fontFamily: text}}>
    <div style={{fontSize: 20, fontWeight: 800, letterSpacing: 2, color: C.violet}}>LEISTUNGSENTSCHEIDUNG · FASSUNG 1</div>
    <div style={{fontFamily: display, fontSize: 52, fontWeight: 800, color: C.ink, margin: '12px 0 8px'}}>Leistung anerkannt</div>
    <div style={{fontSize: 26, color: C.ink}}>314'000.00 EUR · RisikoLeben PZ-2025</div>
    <div style={{fontSize: 21, color: C.muted, marginTop: 10}}>Grundlage: Tarifblatt PZ-2025 – die Dreijahresfrist gilt nur bei Suizid.</div>
    <div
      style={{
        marginTop: 28, display: 'inline-block', padding: '18px 34px', borderRadius: 16, fontSize: 26, fontWeight: 800,
        color: '#fff', background: approved > 0.5 ? C.forest : C.violet, transform: `scale(${1 - pressed * 0.06})`,
        boxShadow: `0 0 0 ${pressed * 14}px rgba(109,78,216,.18)`,
      }}
    >
      {approved > 0.5 ? '✓ Freigegeben' : 'Entscheidung freigeben'}
    </div>
    <div
      style={{
        position: 'absolute', right: 28, top: -36, padding: '14px 24px', border: `5px solid ${C.forest}`, borderRadius: 14,
        color: C.forest, fontFamily: display, fontWeight: 900, fontSize: 34, letterSpacing: 2, background: 'rgba(255,255,255,.85)',
        opacity: approved, transform: `rotate(-8deg) scale(${interpolate(approved, [0, 1], [2.4, 1])})`,
      }}
    >
      VERSIEGELT
      <div style={{fontFamily: text, fontSize: 15, fontWeight: 600, letterSpacing: 0}}>PDF-Beleg · SHA-256 a41f…9c02</div>
    </div>
  </div>
);

/** Eingriffsfenster: Countdown bis zum automatischen Versand. */
export const Countdown: React.FC<{secondsLeft: number; stopped: number; pressed: number}> = ({secondsLeft, stopped, pressed}) => {
  const s = Math.max(0, Math.floor(secondsLeft));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <div style={{fontFamily: text}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <Badge label={stopped > 0.5 ? 'Versand gestoppt' : 'Geht automatisch raus in'} tone={stopped > 0.5 ? 'red' : 'amber'} />
        <span style={{fontSize: 22, color: C.muted}}>PF-1031 · Wasserschaden VTR-00000301</span>
      </div>
      <div
        style={{
          fontFamily: display, fontWeight: 900, fontSize: 150, letterSpacing: -4, lineHeight: 1.1, margin: '18px 0',
          color: stopped > 0.5 ? C.muted : C.forest, textDecoration: stopped > 0.5 ? 'line-through' : 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {hh}:{mm}:{ss}
      </div>
      <div style={{display: 'flex', gap: 18}}>
        <div style={{padding: '16px 28px', borderRadius: 14, border: `2px solid ${C.line}`, fontSize: 24, fontWeight: 700, color: C.ink}}>
          Ändern und Versand stoppen
        </div>
        <div
          style={{
            padding: '16px 28px', borderRadius: 14, fontSize: 24, fontWeight: 800, color: '#fff', background: C.red,
            transform: `scale(${1 - pressed * 0.07})`, boxShadow: `0 0 0 ${pressed * 14}px rgba(201,72,59,.2)`,
          }}
        >
          Versand stoppen
        </div>
      </div>
    </div>
  );
};

export type LogLine = {time: string; who: string; what: string; human?: boolean};

export const AuditLog: React.FC<{lines: LogLine[]; visible: number}> = ({lines, visible}) => (
  <div style={{fontFamily: text}}>
    {lines.map((line, i) => {
      const appear = Math.max(0, Math.min(1, visible - i));
      return (
        <div
          key={i}
          style={{
            display: 'flex', gap: 22, alignItems: 'center', padding: '15px 6px', borderBottom: `1px solid ${C.line}`,
            opacity: appear, transform: `translateY(${(1 - appear) * 24}px)`,
          }}
        >
          <span style={{width: 90, fontSize: 21, color: C.muted, fontVariantNumeric: 'tabular-nums'}}>{line.time}</span>
          <Badge label={line.who} tone={line.human ? 'violet' : 'mint'} style={{width: 150, textAlign: 'center'}} />
          <span style={{fontSize: 25, color: C.ink, fontWeight: 500}}>{line.what}</span>
        </div>
      );
    })}
  </div>
);

/** Mauszeiger, der zu einem Punkt fährt und klickt. */
export const Cursor: React.FC<{from: [number, number]; to: [number, number]; arriveAt: number; clickAt: number}> = ({
  from, to, arriveAt, clickAt,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const move = spring({frame, fps, durationInFrames: arriveAt, config: {damping: 200}});
  const click = frame >= clickAt ? Math.exp(-(frame - clickAt) / 4) : 0;
  const x = interpolate(move, [0, 1], [from[0], to[0]]);
  const y = interpolate(move, [0, 1], [from[1], to[1]]);
  return (
    <div style={{position: 'absolute', left: x, top: y, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', left: -30, top: -30, width: 60, height: 60, borderRadius: 30,
          border: `4px solid ${C.mint}`, opacity: click, transform: `scale(${2 - click})`,
        }}
      />
      <svg width="46" height="46" viewBox="0 0 24 24" style={{transform: `scale(${1 - click * 0.15})`}}>
        <path d="M4 2l16 9-7 2-3 7z" fill={C.ink} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
