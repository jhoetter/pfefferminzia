// Die Kommandozentrale als eine große React-Oberfläche (1920×1080). Die Kamera fährt
// später durch sie hindurch; was darin passiert, hängt nur vom Bild `f` ab – so liegen
// alle Ereignisse (Mail trifft ein, Sparte rastet ein, Klick, Stempel) genau auf dem Takt.
import React from 'react';
import {interpolate} from 'remotion';
import {BAR, BEAT, C, clamp, display, easeOut, ramp, text} from './theme';

// ------------------------------------------------------------------ Raster
export const SIDEBAR_W = 250;
export const LIST_X = 250;
export const LIST_W = 560;
export const DETAIL_X = 810;
export const DETAIL_W = 1110;
const ROW_H = 96;
const LIST_TOP = 84;

// Ankerpunkte für Kamera und Mauszeiger (in Oberflächen-Koordinaten)
export const A = {
  inboxBadge: {x: 212, y: 136},
  navQueue: {x: 120, y: 240},
  listTop: {x: LIST_X + LIST_W / 2, y: 300},
  body: {x: DETAIL_X + 470, y: 235},
  sheets: {x: DETAIL_X + 520, y: 470},
  sendOld: {x: DETAIL_X + 975, y: 1000},
  evidence: {x: DETAIL_X + 555, y: 470},
  decision: {x: DETAIL_X + 555, y: 730},
  approveButton: {x: DETAIL_X + 205, y: 800},
  reply: {x: DETAIL_X + 555, y: 960},
  ring: {x: DETAIL_X + 300, y: 470},
  queue: {x: DETAIL_X + 555, y: 470},
  stopButton: {x: DETAIL_X + 975, y: 330},
  log: {x: DETAIL_X + 555, y: 420},
};

// ------------------------------------------------------------------ Daten (alles erfunden)
type Mail = {id: string; from: string; subject: string; line?: 'Leben' | 'Haftpflicht'; at: number; sortedAt?: number};

const SENDERS = [
  ['Martin Ortlepp', 'Erbschein nachgereicht – VTR-00000202'],
  ['Broker Mittelland AG', 'Wasserschaden und Teilzahlung'],
  ['Simone Niederberger', 'E-Bike des Nachbarn beschädigt'],
  ['Tim Pieper', 'Hundebiss – warum abgelehnt?'],
  ['Anna Grimm', 'Nochmals: Wasserschaden beim Transport'],
  ['Jonas Keller', 'Bezugsberechtigung ändern'],
  ['Lea Brunner', 'Adresse geändert'],
  ['Hausverwaltung Seeblick', 'Leitungswasser im 3. OG'],
  ['Mara Vogt', 'Kündigung zum Jahresende?'],
  ['Kemal Aydin', 'Rückfrage Beitragsrechnung'],
  ['Sabine Nazari', 'Rückfrage zur Leistungsentscheidung'],
];

/** Akt 1: Die Post trifft ein – erst auf jedem Schlag, dann doppelt, dann vierfach so schnell. */
export const OLD_MAILS: Mail[] = (() => {
  const frames: number[] = [];
  for (let f = 16; f < 256; f += BEAT) frames.push(f);
  for (let f = 256; f < 512; f += BEAT / 2) frames.push(f);
  for (let f = 512; f < 704; f += BEAT / 4) frames.push(f);
  const preload = [-400, -300, -200, -100].map((at, i) => ({at, i}));
  return [
    ...preload.map(({at, i}) => ({id: `PF-${980 + i}`, from: SENDERS[(i + 5) % SENDERS.length][0], subject: SENDERS[(i + 5) % SENDERS.length][1], at})),
    ...frames.map((at, i) => ({id: `PF-${1000 + i}`, from: SENDERS[i % SENDERS.length][0], subject: SENDERS[i % SENDERS.length][1], at})),
  ];
})();
export const OLD_BASE_COUNT = 142 - (OLD_MAILS.length - 4);

/** Akt 2: Dieselbe Post – jetzt rastet die Sparte ein, eine Mail nach der anderen, im Achtel-Takt. */
const S = 848; // Beginn der Tour
export const NEW_MAILS: Mail[] = [
  {id: 'PF-1042', from: 'Sabine Nazari', subject: 'Rückfrage zur Leistungsentscheidung', line: 'Leben', at: S + BEAT, sortedAt: S + 2 * BEAT},
  {id: 'PF-1041', from: 'Simone Niederberger', subject: 'E-Bike des Nachbarn beschädigt', line: 'Haftpflicht', at: -100, sortedAt: S + 2 * BEAT + 8},
  {id: 'PF-1040', from: 'Martin Ortlepp', subject: 'Erbschein nachgereicht – VTR-00000202', line: 'Leben', at: -100, sortedAt: S + 3 * BEAT},
  {id: 'PF-1039', from: 'Broker Mittelland AG', subject: 'Wasserschaden und Teilzahlung', line: 'Haftpflicht', at: -100, sortedAt: S + 3 * BEAT + 8},
  {id: 'PF-1038', from: 'Anna Grimm', subject: 'Nochmals: Wasserschaden beim Transport', line: 'Haftpflicht', at: -100, sortedAt: S + 4 * BEAT},
  {id: 'PF-1037', from: 'Jonas Keller', subject: 'Bezugsberechtigung ändern', line: 'Leben', at: -100, sortedAt: S + 4 * BEAT + 8},
  {id: 'PF-1036', from: 'Hausverwaltung Seeblick', subject: 'Leitungswasser im 3. OG', line: 'Haftpflicht', at: -100, sortedAt: S + 5 * BEAT},
  {id: 'PF-1035', from: 'Tim Pieper', subject: 'Hundebiss – warum abgelehnt?', line: 'Haftpflicht', at: -100, sortedAt: S + 5 * BEAT + 8},
  {id: 'PF-1034', from: 'Kemal Aydin', subject: 'Rückfrage Beitragsrechnung', at: -100},
  {id: 'PF-1033', from: 'Mara Vogt', subject: 'Kündigung zum Jahresende?', at: -100},
];

// Zeitpunkte der Handlung in Akt 2 (alle auf Schlägen)
export const T = {
  select: S + 7 * BEAT, // Nazari wird geöffnet
  evidence: S + 2 * BAR + BEAT, // Belege lösen sich auf
  click: S + 4 * BAR + 2 * BEAT, // „Entscheidung freigeben“
  stamp: S + 4 * BAR + 3 * BEAT, // Stempel landet
  attach: S + 5 * BAR + BEAT, // PDF hängt an der Antwort
  queue: S + 6 * BAR, // Ansicht Eingriffsfenster
  stop: S + 7 * BAR, // „Versand stoppen“
  log: S + 8 * BAR, // Ansicht Aktivität
};

// ------------------------------------------------------------------ kleine Bausteine
const Chip: React.FC<{label: string; bg: string; fg: string; style?: React.CSSProperties}> = ({label, bg, fg, style}) => (
  <span style={{display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: bg, color: fg, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', ...style}}>
    {label}
  </span>
);

const LineChip: React.FC<{line: 'Leben' | 'Haftpflicht'; t: number}> = ({line, t}) => (
  <div style={{width: 118 * t, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end', opacity: t}}>
    <Chip label={line} bg={line === 'Leben' ? C.violetSoft : C.mintSoft} fg={line === 'Leben' ? C.violet : C.forest} style={{transform: `translateX(${(1 - t) * 30}px)`}} />
  </div>
);

/** Zählwerk, dessen Ziffern rollen statt zu springen. */
const Odometer: React.FC<{value: number; size: number; color: string}> = ({value, size, color}) => {
  const digits = String(Math.floor(value)).split('');
  const frac = value - Math.floor(value);
  return (
    <span style={{display: 'inline-flex', height: size * 1.15, overflow: 'hidden', fontVariantNumeric: 'tabular-nums', color}}>
      {digits.map((d, i) => {
        const last = i === digits.length - 1;
        const shift = last ? frac : 0;
        return (
          <span key={i} style={{display: 'inline-block', transform: `translateY(${-(Number(d) + shift) * size * 1.15}px)`}}>
            {Array.from({length: 11}, (_, n) => (
              <span key={n} style={{display: 'block', height: size * 1.15, lineHeight: `${size * 1.15}px`}}>{n % 10}</span>
            ))}
          </span>
        );
      })}
    </span>
  );
};

// ------------------------------------------------------------------ Sidebar
const NAV = ['Posteingang', 'Freigaben', 'Eingriffsfenster', 'Bestand', 'Aktivität'] as const;

const Sidebar: React.FC<{f: number; count: number; active: (typeof NAV)[number]; modern: boolean}> = ({count, active, modern}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: SIDEBAR_W, height: 1080, background: C.sidebar, borderRight: `1px solid ${C.line}`, padding: '26px 18px'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40}}>
      <MintMark size={40} />
      <div style={{fontFamily: display, fontWeight: 800, fontSize: 24, color: C.forest, letterSpacing: -0.5}}>
        Pfefferminzia{modern ? <span style={{color: C.mint}}> 2.0</span> : null}
      </div>
    </div>
    {NAV.filter((item) => modern || item === 'Posteingang' || item === 'Bestand').map((item) => (
      <div
        key={item}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, padding: '0 14px', marginBottom: 4,
          borderRadius: 10, fontSize: 18, fontWeight: 600, background: item === active ? '#e8ebe6' : 'transparent',
          color: item === active ? C.ink : C.muted,
        }}
      >
        {item}
        {item === 'Posteingang' ? (
          <span style={{minWidth: 44, padding: '2px 10px', borderRadius: 999, background: modern ? C.forest : C.red, color: '#fff', fontSize: 16, fontWeight: 800, textAlign: 'center'}}>
            <Odometer value={count} size={16} color="#fff" />
          </span>
        ) : null}
      </div>
    ))}
  </div>
);

export const MintMark: React.FC<{size: number; draw?: number; fill?: number}> = ({size, draw = 1, fill = 1}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="18" fill={C.forest} opacity={fill} />
    <path
      d="M14 18h36v22c0 7-8 11-18 17-10-6-18-10-18-17V18Z" fill={C.mintSoft} fillOpacity={fill}
      stroke={C.mint} strokeWidth={fill < 1 ? 2 : 0} strokeDasharray={140} strokeDashoffset={140 * (1 - draw)}
    />
    <path
      d="M32 46V25M32 39c-7 0-12-5-12-12 7 0 12 5 12 12Zm0-7c0-7 5-12 12-12 0 7-5 12-12 12Z" fill={C.mint} fillOpacity={fill}
      stroke={fill < 1 ? C.mint : C.forest} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={120} strokeDashoffset={120 * (1 - draw)}
    />
  </svg>
);

// ------------------------------------------------------------------ Posteingang
const MailList: React.FC<{f: number; mails: Mail[]; selected?: string; modern: boolean}> = ({f, mails, selected, modern}) => {
  const visible = mails.filter((m) => f >= m.at).sort((a, b) => b.at - a.at).slice(0, 12);
  return (
    <div style={{position: 'absolute', left: LIST_X, top: 0, width: LIST_W, height: 1080, background: '#fff', borderRight: `1px solid ${C.line}`, overflow: 'hidden'}}>
      <div style={{height: LIST_TOP, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: `1px solid ${C.line}`}}>
        <div style={{fontSize: 24, fontWeight: 800, color: C.ink}}>Posteingang</div>
        <div style={{fontSize: 16, color: C.muted}}>Montag · 08:02</div>
      </div>
      {visible.map((m) => {
        const enter = ramp(f, m.at, m.at + 8);
        const fresh = interpolate(f, [m.at, m.at + 40], [1, 0], clamp);
        const sorted = m.sortedAt !== undefined ? ramp(f, m.sortedAt, m.sortedAt + 8) : 0;
        const isSelected = selected === m.id;
        return (
          <div key={m.id} style={{height: ROW_H * enter, overflow: 'hidden'}}>
            <div
              style={{
                height: ROW_H, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', borderBottom: `1px solid ${C.line}`,
                transform: `translateX(${(1 - enter) * -60}px)`, opacity: 0.3 + 0.7 * enter,
                background: isSelected ? '#eef6f1' : modern ? `rgba(82,185,134,${0.16 * fresh})` : `rgba(28,29,31,${0.09 * fresh})`,
                boxShadow: isSelected ? `inset 4px 0 0 ${C.mint}` : 'none',
              }}
            >
              <div style={{width: 10, height: 10, borderRadius: 5, background: modern ? C.mint : C.red, opacity: 0.4 + 0.6 * fresh, flex: 'none'}} />
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 15, color: C.muted, marginBottom: 4}}>
                  <span>{m.from}</span>
                  <span>{m.id}</span>
                </div>
                <div style={{fontSize: 19, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.subject}</div>
              </div>
              {modern && m.line ? <LineChip line={m.line} t={sorted} /> : null}
              {!modern ? <Chip label="Sparte ?" bg="#efefec" fg={C.faint} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ Fall-Ansicht
const Card: React.FC<{top: number; height: number; children: React.ReactNode; style?: React.CSSProperties}> = ({top, height, children, style}) => (
  <div style={{position: 'absolute', left: 48, right: 48, top, height, borderRadius: 18, border: `1px solid ${C.line}`, background: '#fff', padding: '22px 28px', ...style}}>
    {children}
  </div>
);

const Label: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.muted}) => (
  <div style={{fontSize: 14, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color, marginBottom: 12}}>{children}</div>
);

const CaseHeader: React.FC<{modern: boolean; f: number}> = ({modern, f}) => (
  <div style={{position: 'absolute', left: 48, right: 48, top: 30}}>
    <div style={{fontSize: 30, fontWeight: 800, color: C.ink, marginBottom: 10}}>Rückfrage zur Leistungsentscheidung</div>
    <div style={{display: 'flex', gap: 10, alignItems: 'center', fontSize: 17, color: C.muted}}>
      Sabine Nazari · PF-1042
      {modern ? <LineChip line="Leben" t={1} /> : <Chip label="Sparte ?" bg="#efefec" fg={C.faint} />}
      {modern ? <Chip label={f >= T.stamp ? 'Freigegeben' : 'Wartet auf Freigabe'} bg={f >= T.stamp ? C.mintSoft : C.amberSoft} fg={f >= T.stamp ? C.forest : C.amber} /> : null}
    </div>
  </div>
);

const MailBody: React.FC<{modern: boolean; f: number}> = ({modern, f}) => {
  const mark = modern ? ramp(f, T.evidence - 8, T.evidence) : 0;
  return (
    <Card top={130} height={190}>
      <Label>Mail</Label>
      <div style={{fontSize: 19, lineHeight: 1.55, color: C.ink}}>
        Sie haben mir angekündigt, die Leistung aus{' '}
        <span style={{padding: '1px 6px', borderRadius: 6, background: `rgba(82,185,134,${0.3 * mark})`, boxShadow: mark ? `0 0 0 2px rgba(82,185,134,${mark})` : 'none', fontWeight: 700}}>
          VTR-00000602
        </span>{' '}
        nach dem Tod meines Mannes abzulehnen. Bitte prüfen Sie das erneut – er ist an einem Herzinfarkt gestorben.
      </div>
    </Card>
  );
};

const Field: React.FC<{label: string; value: string; t: number; strong?: boolean}> = ({label, value, t, strong}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44, borderBottom: `1px solid ${C.line}`}}>
    <span style={{fontSize: 16, color: C.muted}}>{label}</span>
    <span style={{position: 'relative', fontSize: 19, fontWeight: strong ? 800 : 600, color: strong ? C.forest : C.ink}}>
      <span style={{opacity: t}}>{value}</span>
      <span style={{position: 'absolute', right: 0, top: 4, width: 170, height: 16, borderRadius: 6, background: '#eeeeeb', opacity: 1 - t}} />
    </span>
  </div>
);

const Evidence: React.FC<{f: number}> = ({f}) => {
  const rows: [string, string, boolean?][] = [
    ['Versicherungsnehmer', 'Farid Nazari'],
    ['Vertrag', 'VTR-00000602 · RisikoLeben'],
    ['Tarifgeneration', 'PZ-2025', true],
    ['Versicherungssumme', "314'000 EUR"],
    ['Begünstigt', 'Sabine Nazari'],
    ['Leistungsakte', 'LF-2026-0602 · Herzinfarkt'],
  ];
  return (
    <Card top={340} height={265} style={{padding: '18px 28px'}}>
      <Label color={C.forest}>Aus dem Bestand · von Claude zugeordnet</Label>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 40}}>
        {rows.map(([label, value, strong], i) => (
          <Field key={label} label={label} value={value} strong={strong} t={ramp(f, T.evidence + i * 8, T.evidence + i * 8 + 8)} />
        ))}
      </div>
    </Card>
  );
};

const TariffGuess: React.FC = () => (
  <Card top={340} height={265}>
    <Label>Tarifblätter</Label>
    <div style={{display: 'flex', gap: 22}}>
      {['PL-2017', 'MZ-2019', 'PZ-2025'].map((name) => (
        <div key={name} style={{flex: 1, height: 150, borderRadius: 14, border: `1px dashed ${C.faint}`, display: 'grid', placeItems: 'center', background: '#fafaf8'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 22, fontWeight: 800, color: C.ink}}>{name}</div>
            <div style={{fontSize: 40, color: C.faint, fontWeight: 800}}>?</div>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const Decision: React.FC<{f: number}> = ({f}) => {
  const press = f >= T.click ? Math.exp(-(f - T.click) / 4) : 0;
  const approved = f >= T.click + 2;
  const stamp = ramp(f, T.stamp, T.stamp + 6, easeOut);
  return (
    <Card top={625} height={225} style={{background: C.violetSoft, borderColor: approved ? C.forest : C.violet, borderWidth: 2}}>
      <Label color={C.violet}>Vorschlag von Claude · Leistungsentscheidung</Label>
      <div style={{fontFamily: display, fontSize: 38, fontWeight: 800, color: C.ink, marginBottom: 4}}>Leistung anerkannt · 314'000 EUR</div>
      <div style={{fontSize: 17, color: C.muted}}>Grundlage: Tarifblatt PZ-2025 – die Dreijahresfrist gilt nur bei Suizid.</div>
      <div
        style={{
          position: 'absolute', left: 28, bottom: 22, padding: '12px 26px', borderRadius: 12, fontSize: 19, fontWeight: 800, color: '#fff',
          background: approved ? C.forest : C.violet, transform: `scale(${1 - press * 0.06})`,
        }}
      >
        {approved ? '✓ Freigegeben' : 'Entscheidung freigeben'}
      </div>
      <div
        style={{
          position: 'absolute', right: 40, top: 40, padding: '10px 20px', border: `4px solid ${C.forest}`, borderRadius: 12, background: 'rgba(255,255,255,.9)',
          fontFamily: display, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: C.forest, opacity: stamp,
          transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
        }}
      >
        VERSIEGELT
        <div style={{fontFamily: text, fontSize: 13, fontWeight: 600, letterSpacing: 0}}>PDF-Beleg · SHA-256 a41f…9c02</div>
      </div>
    </Card>
  );
};

const Composer: React.FC<{f: number; modern: boolean}> = ({f, modern}) => {
  const attach = modern ? ramp(f, T.attach, T.attach + 10) : 0;
  const ready = modern && f >= T.stamp;
  return (
    <Card top={870} height={185}>
      <Label>Antwort</Label>
      <div style={{fontSize: 18, lineHeight: 1.5, color: modern ? C.ink : C.faint, width: 700}}>
        {modern
          ? 'Sehr geehrte Frau Nazari, wir haben Ihren Einwand geprüft: Die Leistung aus VTR-00000602 (PZ-2025) wird anerkannt …'
          : 'Sehr geehrte Frau Nazari, …'}
      </div>
      {modern ? (
        <div style={{position: 'absolute', left: 28, bottom: 20, opacity: attach, transform: `translateY(${(1 - attach) * -60}px)`}}>
          <Chip label="📎 Entscheidung-PF-1042-v1.pdf" bg={C.mintSoft} fg={C.forest} />
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute', right: 28, bottom: 22, padding: '12px 30px', borderRadius: 12, fontSize: 19, fontWeight: 800,
          color: '#fff', background: modern ? (ready ? C.forest : '#c9ccc9') : C.ink,
        }}
      >
        Senden
      </div>
    </Card>
  );
};

// ------------------------------------------------------------------ Eingriffsfenster
const QUEUE = [
  {id: 'PF-1039', subject: 'Wasserschaden und Teilzahlung', left: 23.9},
  {id: 'PF-1041', subject: 'E-Bike des Nachbarn beschädigt', left: 21.4},
  {id: 'PF-1036', subject: 'Leitungswasser im 3. OG', left: 18.2},
];

const QueueView: React.FC<{f: number}> = ({f}) => {
  const running = Math.min(f, T.stop) - T.queue;
  const stopped = f >= T.stop + 2;
  const press = f >= T.stop ? Math.exp(-(f - T.stop) / 4) : 0;
  const hours = Math.max(0, 23.99 - running * 0.11);
  const r = 170;
  const circ = 2 * Math.PI * r;
  const fmt = (h: number) => {
    const s = Math.floor(h * 3600);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  return (
    <>
      <div style={{position: 'absolute', left: 48, top: 30, fontSize: 30, fontWeight: 800, color: C.ink}}>Eingriffsfenster</div>
      <svg width={420} height={420} style={{position: 'absolute', left: 90, top: 260}}>
        <circle cx={210} cy={210} r={r} fill="none" stroke={C.line} strokeWidth={22} />
        <circle
          cx={210} cy={210} r={r} fill="none" stroke={stopped ? C.red : C.mint} strokeWidth={22} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - hours / 24)} transform="rotate(-90 210 210)"
        />
        <text x={210} y={165} textAnchor="middle" fontFamily={text} fontSize={20} fill={C.muted}>{stopped ? 'Versand' : 'Automatischer Versand in'}</text>
        <text x={210} y={228} textAnchor="middle" fontFamily={display} fontWeight={800} fontSize={58} fill={stopped ? C.red : C.ink}>
          {stopped ? 'angehalten' : fmt(hours)}
        </text>
        <text x={210} y={272} textAnchor="middle" fontFamily={text} fontSize={20} fill={C.muted}>{stopped ? 'Du prüfst selbst · PF-1039' : 'Antwort PF-1039'}</text>
      </svg>
      {QUEUE.map((q, i) => {
        const isFirst = i === 0;
        return (
          <div
            key={q.id}
            style={{
              position: 'absolute', left: 560, right: 48, top: 170 + i * 200, height: 176, borderRadius: 18, padding: '22px 26px',
              border: `${isFirst && stopped ? 2 : 1}px solid ${isFirst && stopped ? C.red : C.line}`, background: '#fff',
            }}
          >
            <div style={{fontSize: 15, color: C.muted, marginBottom: 6}}>{q.id} · Haftpflicht</div>
            <div style={{fontSize: 21, fontWeight: 800, color: C.ink, marginBottom: 12}}>{q.subject}</div>
            <Chip
              label={isFirst && stopped ? 'Versand angehalten – du prüfst' : `Geht automatisch raus in ${fmt(isFirst ? hours : q.left - running * 0.11)}`}
              bg={isFirst && stopped ? C.redSoft : C.amberSoft} fg={isFirst && stopped ? C.red : C.amber}
            />
            {isFirst ? (
              <div
                style={{
                  position: 'absolute', right: 24, bottom: 22, padding: '11px 22px', borderRadius: 12, fontSize: 18, fontWeight: 800,
                  color: '#fff', background: stopped ? C.faint : C.red, transform: `scale(${1 - press * 0.07})`,
                }}
              >
                Versand anhalten
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------ Aktivität
const LOG: [string, string, string, boolean?][] = [
  ['08:02', 'Claude', 'Mail abgerufen · PF-1042'],
  ['08:02', 'Vorsortierung', 'Sparte Leben – Stichwort „Leistung“'],
  ['08:03', 'Claude', 'Vertrag VTR-00000602 zugeordnet · PZ-2025'],
  ['08:03', 'Claude', 'Leistungsentscheidung vorgelegt · Fassung 1'],
  ['08:11', 'Mensch', 'Entscheidung freigegeben · Beleg versiegelt', true],
  ['08:12', 'Mensch', 'Antwort mit Beleg gesendet', true],
  ['09:40', 'Mensch', 'Automatischen Versand angehalten · PF-1039', true],
];

const ActivityView: React.FC<{f: number}> = ({f}) => (
  <>
    <div style={{position: 'absolute', left: 48, top: 30, fontSize: 30, fontWeight: 800, color: C.ink}}>Aktivität</div>
    <div style={{position: 'absolute', left: 48, top: 78, fontSize: 17, color: C.muted}}>Wer hat wann was getan – Agent und Mensch.</div>
    {LOG.map(([time, who, what, human], i) => {
      const t = ramp(f, T.log + BEAT + i * 8, T.log + BEAT + i * 8 + 8);
      return (
        <div
          key={i}
          style={{
            position: 'absolute', left: 48, right: 48, top: 150 + i * 84, height: 72, display: 'flex', alignItems: 'center', gap: 24,
            padding: '0 24px', borderRadius: 14, background: '#fff', border: `1px solid ${C.line}`, opacity: t, transform: `translateY(${(1 - t) * 24}px)`,
          }}
        >
          <span style={{width: 70, fontSize: 18, color: C.muted, fontVariantNumeric: 'tabular-nums'}}>{time}</span>
          <Chip label={who} bg={human ? C.violetSoft : C.mintSoft} fg={human ? C.violet : C.forest} style={{width: 140, textAlign: 'center'}} />
          <span style={{fontSize: 20, fontWeight: 600, color: C.ink}}>{what}</span>
        </div>
      );
    })}
  </>
);

// ------------------------------------------------------------------ Mauszeiger
export type CursorKey = {f: number; x: number; y: number; click?: boolean};

const Pointer: React.FC<{f: number; keys: CursorKey[]}> = ({f, keys}) => {
  if (!keys.length || f < keys[0].f - 6 || f > keys[keys.length - 1].f + 30) return null;
  let x = keys[0].x;
  let y = keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f >= a.f && f <= b.f) {
      const t = ramp(f, a.f, b.f);
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    } else if (f > b.f) {
      x = b.x;
      y = b.y;
    }
  }
  const clickKey = keys.find((k) => k.click && f >= k.f && f < k.f + 14);
  const ring = clickKey ? 1 - (f - clickKey.f) / 14 : 0;
  const appear = ramp(f, keys[0].f - 6, keys[0].f);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: appear, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: -26, top: -26, width: 52, height: 52, borderRadius: 26, border: `3px solid ${C.mint}`, opacity: ring, transform: `scale(${1.8 - ring})`}} />
      <svg width="34" height="34" viewBox="0 0 24 24" style={{transform: `scale(${1 - ring * 0.12})`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.25))'}}>
        <path d="M4 2l16 9-7 2-3 7z" fill={C.ink} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// ------------------------------------------------------------------ Ganze Oberfläche
export const Cockpit: React.FC<{f: number; modern: boolean; cursor?: CursorKey[][]}> = ({f, modern, cursor = []}) => {
  const view = !modern ? 'inbox' : f >= T.log ? 'activity' : f >= T.queue ? 'queue' : 'inbox';
  const mails = modern ? NEW_MAILS : OLD_MAILS;
  const count = modern ? 10 : OLD_BASE_COUNT + OLD_MAILS.filter((m) => m.at >= 0 && f >= m.at).length;
  const active = view === 'queue' ? 'Eingriffsfenster' : view === 'activity' ? 'Aktivität' : 'Posteingang';
  const caseOpen = !modern || f >= T.select;
  const caseIn = modern ? ramp(f, T.select, T.select + 10) : 1;
  return (
    <div style={{position: 'relative', width: 1920, height: 1080, background: C.paper, fontFamily: text, overflow: 'hidden'}}>
      <Sidebar f={f} count={count} active={active} modern={modern} />
      <MailList f={f} mails={mails} selected={modern && f >= T.select ? 'PF-1042' : undefined} modern={modern} />
      <div style={{position: 'absolute', left: DETAIL_X, top: 0, width: DETAIL_W, height: 1080}}>
        {view === 'inbox' && caseOpen ? (
          <div style={{position: 'absolute', inset: 0, opacity: caseIn, transform: `translateX(${(1 - caseIn) * 40}px)`}}>
            <CaseHeader modern={modern} f={f} />
            <MailBody modern={modern} f={f} />
            {modern ? <Evidence f={f} /> : <TariffGuess />}
            {modern ? <Decision f={f} /> : null}
            <Composer f={f} modern={modern} />
          </div>
        ) : null}
        {view === 'inbox' && !caseOpen ? (
          <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 1 - caseIn}}>
            <div style={{textAlign: 'center', color: C.faint}}>
              <div style={{opacity: 0.35, display: 'inline-block'}}><MintMark size={90} /></div>
              <div style={{fontSize: 20, marginTop: 14}}>Kein Fall geöffnet</div>
            </div>
          </div>
        ) : null}
        {view === 'queue' ? <QueueView f={f} /> : null}
        {view === 'activity' ? <ActivityView f={f} /> : null}
      </div>
      {cursor.map((keys, i) => <Pointer key={i} f={f} keys={keys} />)}
    </div>
  );
};
