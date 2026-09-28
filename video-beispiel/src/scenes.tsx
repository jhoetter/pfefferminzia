// Die Szenen des Launch-Videos. Jede Szene bekommt `at` (ihr Startbild im Video),
// damit ihre Pulse genau auf den Schlägen der Musik liegen.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop, BeatHeadline, Spotlight} from './components/motion';
import {AuditLog, Badge, Countdown, Cursor, DecisionCard, Field, Logo, Mail, MailRow, Window} from './components/ui';
import {BEAT, C, DROP, beatPulse, display, text} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Blendet eine Szene in den letzten Bildern mit einem kurzen Zoom aus. */
const Shell: React.FC<{length: number; children: React.ReactNode}> = ({length, children}) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [length - 6, length], [1, 0], clamp);
  return <AbsoluteFill style={{opacity: out, transform: `scale(${1 + (1 - out) * 0.06})`}}>{children}</AbsoluteFill>;
};

// ---------------------------------------------------------------- Akt 1: das Chaos
const INBOX: Mail[] = [
  {id: 'PF-1019', from: 'Martin Ortlepp', subject: 'Leistungsprüfung RisikoLeben — VTR-00000202'},
  {id: 'PF-1020', from: 'Broker Mittelland AG', subject: 'Wasserschaden und Teilzahlung'},
  {id: 'PF-1021', from: 'Simone Niederberger', subject: 'E-Bike des Nachbarn beschädigt'},
  {id: 'PF-1022', from: 'Sabine Nazari', subject: 'Rückfrage zur Leistungsentscheidung'},
  {id: 'PF-1023', from: 'Tim Pieper', subject: 'Hundebiss – warum abgelehnt?'},
  {id: 'PF-1024', from: 'Anna Grimm', subject: 'Nochmals: Wasserschaden beim Transport'},
  {id: 'PF-1025', from: 'Kundenservice', subject: 'Bezugsberechtigung ändern'},
  {id: 'PF-1026', from: 'Martin Ortlepp', subject: 'Erbschein nachgereicht'},
];

export const Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pulse = beatPulse(frame, 0) * 0.5;
  const count = Math.round(interpolate(frame, [0, 200, 460, 620], [3, 17, 96, 142], clamp));
  const shake = frame > 460 ? Math.sin(frame * 1.9) * interpolate(frame, [460, 690], [0, 7], clamp) : 0;
  const zoom = interpolate(frame, [0, 640, 700], [1, 1.12, 1.6], clamp);
  const fade = interpolate(frame, [650, 700], [1, 0], clamp);
  const title =
    frame < 220 ? ['Montag,', '8:02', 'Uhr.'] : frame < 460 ? [`${count}`, 'neue', 'Mails.'] : ['Vertrag?', 'Tarif?', 'Wer', 'entscheidet?'];
  const titleStart = frame < 220 ? 0 : frame < 460 ? 220 : 460;
  return (
    <AbsoluteFill>
      <Backdrop pulse={pulse} dark />
      <AbsoluteFill style={{opacity: fade, transform: `scale(${zoom}) translateX(${shake}px)`}}>
        <div style={{position: 'absolute', left: 140, top: 150, width: 760}}>
          <div style={{fontFamily: text, fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.mint, marginBottom: 26}}>
            PFEFFERMINZIA VERSICHERUNGEN · POSTEINGANG
          </div>
          <div key={titleStart}>
            <BeatHeadline words={title} startBeat={Math.ceil(titleStart / BEAT)} size={112} color="#fff" />
          </div>
        </div>
        <div style={{position: 'absolute', right: 120, top: 120}}>
          <Window title={`Posteingang · ${count} offen`} width={880}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 14, height: 700, overflow: 'hidden'}}>
              {INBOX.map((mail, i) => {
                const dropIn = spring({frame: frame - 20 - i * 34, fps, config: {damping: 13}});
                return (
                  <div key={mail.id} style={{opacity: dropIn, transform: `translateY(${(1 - dropIn) * -80}px)`}}>
                    <MailRow mail={mail} />
                  </div>
                );
              })}
            </div>
          </Window>
          <div
            style={{
              position: 'absolute', right: -24, top: -24, minWidth: 90, height: 90, borderRadius: 45, padding: '0 20px',
              background: C.red, color: '#fff', fontFamily: display, fontWeight: 900, fontSize: 44, display: 'grid', placeItems: 'center',
              transform: `scale(${1 + pulse * 0.25})`,
            }}
          >
            {count}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{display: 'grid', placeItems: 'center', opacity: interpolate(frame, [680, 692, 716, 720], [0, 1, 1, 0], clamp)}}>
        <div style={{fontFamily: display, fontWeight: 900, fontSize: 150, color: '#fff', letterSpacing: -4}}>Bis jetzt.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Der Drop
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pulse = beatPulse(frame + DROP);
  const flash = Math.exp(-frame / 5);
  const logo = spring({frame, fps, config: {damping: 11, stiffness: 160}});
  const word = spring({frame: frame - BEAT, fps, config: {damping: 14}});
  const two = spring({frame: frame - 2 * BEAT, fps, config: {damping: 8, stiffness: 220}});
  const tag = spring({frame: frame - 4 * BEAT, fps, config: {damping: 200}});
  return (
    <Shell length={128}>
      <Backdrop pulse={pulse} />
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 44}}>
          <div style={{transform: `scale(${logo * (1 + pulse * 0.05)}) rotate(${(1 - logo) * -40}deg)`}}>
            <Logo size={230} />
          </div>
          <div style={{fontFamily: display, fontWeight: 900, fontSize: 190, letterSpacing: -7, color: C.forest, display: 'flex', alignItems: 'baseline'}}>
            <span style={{opacity: word, transform: `translateX(${(1 - word) * -60}px)`, display: 'inline-block'}}>Pfefferminzia</span>
            <span
              style={{
                marginLeft: 36, color: C.mint, display: 'inline-block', opacity: Math.min(1, two * 2),
                transform: `scale(${interpolate(two, [0, 1], [3, 1], clamp)})`,
              }}
            >
              2.0
            </span>
          </div>
        </div>
        <div style={{marginTop: 40, fontFamily: text, fontSize: 44, fontWeight: 500, color: C.muted, opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`}}>
          Kundenpost mit Agent. Entscheidungen beim Menschen.
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: C.mint, opacity: flash}} />
    </Shell>
  );
};

// ---------------------------------------------------------------- Die fünf Bausteine
const Feature: React.FC<{
  at: number; length?: number; step: string; words: string[]; accent?: number; children: (frame: number, pulse: number) => React.ReactNode;
}> = ({at, length = 128, step, words, accent, children}) => {
  const frame = useCurrentFrame();
  const pulse = beatPulse(frame + at);
  const eyebrow = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <Shell length={length}>
      <Backdrop pulse={pulse} />
      <div style={{position: 'absolute', left: 140, top: 0, bottom: 0, width: 660, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{fontFamily: text, fontSize: 28, fontWeight: 800, letterSpacing: 4, color: C.mint, opacity: eyebrow, marginBottom: 24}}>{step}</div>
        <BeatHeadline words={words} size={100} accent={accent} />
      </div>
      <div style={{position: 'absolute', right: 120, top: 0, bottom: 0, width: 920, display: 'flex', alignItems: 'center'}}>{children(frame, pulse)}</div>
    </Shell>
  );
};

const SORTED: Mail[] = [
  {id: 'PF-1022', from: 'Sabine Nazari', subject: 'Rückfrage zur Leistungsentscheidung', line: 'Leben'},
  {id: 'PF-1021', from: 'Simone Niederberger', subject: 'E-Bike des Nachbarn beschädigt', line: 'Haftpflicht'},
  {id: 'PF-1019', from: 'Martin Ortlepp', subject: 'Leistungsprüfung RisikoLeben', line: 'Leben'},
  {id: 'PF-1020', from: 'Broker Mittelland AG', subject: 'Wasserschaden und Teilzahlung', line: 'Haftpflicht'},
];

export const Sorting: React.FC<{at: number}> = ({at}) => {
  const {fps} = useVideoConfig();
  return (
    <Feature at={at} step="01 · EINGÄNGE" words={['Liest', 'jede', 'Mail.']} accent={2}>
      {(frame, pulse) => (
        <Spotlight pulse={pulse} focus={interpolate(frame, [96, 108], [0, 1], clamp)} tilt={-18}>
          <Window title="Posteingang · vorsortiert" width={900}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
              {SORTED.map((mail, i) => (
                <MailRow key={mail.id} mail={mail} highlight={i === 0 && frame > 96}
                  showLine={spring({frame: frame - (2 + i) * BEAT, fps, config: {damping: 10, stiffness: 200}})} />
              ))}
            </div>
            <div style={{marginTop: 22, fontFamily: text, fontSize: 21, color: C.muted}}>Sortiert von: Vorsortierung nach Stichwörtern</div>
          </Window>
        </Spotlight>
      )}
    </Feature>
  );
};

export const Evidence: React.FC<{at: number}> = ({at}) => {
  const {fps} = useVideoConfig();
  const rows: [string, string, boolean?][] = [
    ['Kunde', 'Farid Nazari'],
    ['Vertrag', 'VTR-00000602 · RisikoLeben'],
    ['Tarifgeneration', 'PZ-2025', true],
    ['Versicherungssumme', "314'000 EUR"],
    ['Leistungsakte', 'LF-2026-0602 · Herzinfarkt'],
  ];
  return (
    <Feature at={at} step="02 · WISSEN" words={['Kennt', 'den', 'Bestand.']} accent={2}>
      {(frame, pulse) => (
        <Spotlight pulse={pulse} focus={interpolate(frame, [4 * BEAT, 4 * BEAT + 10], [0, 1], clamp)} tilt={18}>
          <Window title="Aus dem Bestand · PF-1022" width={900}>
            {rows.map(([label, value, strong], i) => (
              <Field key={label} label={label} value={value} strong={strong}
                appear={spring({frame: frame - (1 + i) * BEAT * 0.75, fps, config: {damping: 16}})} />
            ))}
            <div style={{marginTop: 22, display: 'flex', gap: 12}}>
              <Badge label="Tarifblatt PZ-2025 geöffnet" tone="mint" />
              <Badge label="nicht aus der Mail" tone="grey" />
            </div>
          </Window>
        </Spotlight>
      )}
    </Feature>
  );
};

export const Approval: React.FC<{at: number}> = ({at}) => {
  const {fps} = useVideoConfig();
  return (
    <Feature at={at} step="03 · FREIGABE" words={['Du', 'entscheidest.']} accent={0}>
      {(frame, pulse) => {
        const clickAt = 4 * BEAT;
        const pressed = frame >= clickAt ? Math.exp(-(frame - clickAt) / 5) : 0;
        const approved = spring({frame: frame - clickAt - 4, fps, config: {damping: 9, stiffness: 180}});
        return (
          <div style={{position: 'relative'}}>
            <Spotlight pulse={pulse} focus={approved}>
              <div style={{width: 900}}>
                <DecisionCard approved={approved} pressed={pressed} />
              </div>
            </Spotlight>
            <Cursor from={[980, 560]} to={[150, 250]} arriveAt={3 * BEAT} clickAt={clickAt} />
          </div>
        );
      }}
    </Feature>
  );
};

export const Window24h: React.FC<{at: number}> = ({at}) => (
  <Feature at={at} step="04 · EINGRIFFSFENSTER" words={['Eingreifen,', 'bevor', 'es', 'rausgeht.']} accent={0}>
    {(frame, pulse) => {
      const clickAt = 5 * BEAT;
      const pressed = frame >= clickAt ? Math.exp(-(frame - clickAt) / 5) : 0;
      const stopped = frame >= clickAt + 3 ? 1 : 0;
      const secondsLeft = 23 * 3600 + 59 * 60 + 59 - Math.min(frame, clickAt) * 37;
      return (
        <div style={{position: 'relative'}}>
          <Spotlight pulse={pulse} focus={interpolate(frame, [clickAt, clickAt + 8], [0, 1], clamp)} tilt={-14}>
            <Window title="Eingriffsfenster · Haftpflicht" width={900}>
              <Countdown secondsLeft={secondsLeft} stopped={stopped} pressed={pressed} />
            </Window>
          </Spotlight>
          <Cursor from={[1000, 700]} to={[555, 345]} arriveAt={4 * BEAT} clickAt={clickAt} />
        </div>
      );
    }}
  </Feature>
);

export const Protocol: React.FC<{at: number}> = ({at}) => (
  <Feature at={at} step="05 · PROTOKOLL" words={['Alles', 'belegt.']} accent={1}>
    {(frame, pulse) => (
      <Spotlight pulse={pulse} focus={interpolate(frame, [6 * BEAT, 6 * BEAT + 10], [0, 1], clamp)} tilt={14}>
        <Window title="Aktivität" width={900}>
          <AuditLog
            visible={frame / (BEAT * 0.9)}
            lines={[
              {time: '08:02', who: 'Claude', what: 'Mail abgerufen · PF-1022'},
              {time: '08:02', who: 'Vorsortierung', what: 'Sparte Leben – Stichwort „Leistung“'},
              {time: '08:03', who: 'Claude', what: 'Leistungsentscheidung vorgelegt'},
              {time: '08:11', who: 'Mensch', what: 'Entscheidung freigegeben · versiegelt', human: true},
              {time: '08:12', who: 'Mensch', what: 'Antwort mit Beleg gesendet', human: true},
              {time: '09:40', who: 'Mensch', what: 'Versand gestoppt · PF-1031', human: true},
            ]}
          />
        </Window>
      </Spotlight>
    )}
  </Feature>
);

// ---------------------------------------------------------------- Die Botschaft
export const Claim: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const pulse = beatPulse(frame + at);
  const drift = frame * 0.6;
  return (
    <Shell length={192}>
      <Backdrop pulse={pulse} dark />
      <AbsoluteFill style={{opacity: 0.16, filter: 'blur(1px)'}}>
        <div style={{position: 'absolute', left: -120 + drift, top: 90, transform: 'scale(.55) rotate(-6deg)', transformOrigin: 'top left'}}>
          <DecisionCard approved={1} pressed={0} />
        </div>
        <div style={{position: 'absolute', right: -200 - drift, bottom: 40, transform: 'scale(.55) rotate(5deg)', transformOrigin: 'bottom right'}}>
          <Window title="Eingriffsfenster" width={900}><Countdown secondsLeft={42000} stopped={0} pressed={0} /></Window>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 160}}>
        <BeatHeadline words={['Der', 'Agent', 'bereitet', 'vor.']} size={140} color="#fff" accent={1} />
        <BeatHeadline words={['Der', 'Mensch', 'entscheidet.']} startBeat={5} size={140} color="#fff" accent={1} style={{marginTop: 20}} />
      </AbsoluteFill>
    </Shell>
  );
};

export const EndCard: React.FC<{at: number; musicEndsAt: number}> = ({at, musicEndsAt}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pulse = frame + at < musicEndsAt ? beatPulse(frame + at) : 0;
  const s = spring({frame, fps, config: {damping: 14}});
  const small = interpolate(frame, [30, 50], [0, 1], clamp);
  const out = interpolate(frame, [100, 120], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.night}}>
      <AbsoluteFill style={{opacity: out}}>
        <Backdrop pulse={pulse} />
        <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 36, transform: `scale(${0.85 + s * 0.15})`, opacity: s}}>
            <Logo size={170} />
            <div style={{fontFamily: display, fontWeight: 900, fontSize: 140, letterSpacing: -5, color: C.forest}}>
              Pfefferminzia <span style={{color: C.mint}}>2.0</span>
            </div>
          </div>
          <div style={{marginTop: 34, fontFamily: text, fontSize: 40, color: C.ink, fontWeight: 600, opacity: s}}>
            Gebaut an einem Workshop-Tag – mit Claude.
          </div>
          <div style={{position: 'absolute', bottom: 60, fontFamily: text, fontSize: 22, color: C.muted, opacity: small}}>
            Prototyp mit erfundenen Fällen · keine echten Kundendaten · keine Wirksamkeitsversprechen
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
