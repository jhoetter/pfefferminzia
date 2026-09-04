import {
  AlertTriangle, Check, ChevronRight, ClipboardCheck, FileSearch, FileText, RefreshCw,
  Scale, Search, ShieldCheck, UserCheck, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { dateTime } from "./labels";
import type { ClaimDetail, ClaimSummary } from "./types";

const statusLabel: Record<ClaimSummary["status"], string> = {
  new: "Neu", triage: "Triage", awaiting_information: "Unterlagen offen", awaiting_human: "Menschliche Prüfung",
  investigation: "Ermittlung", approved: "Freigegeben", settled: "Reguliert", closed: "Geschlossen",
};
const riskLabel = { low: "Niedrig", medium: "Mittel", high: "Hoch", critical: "Kritisch" } as const;
const actionLabel = {
  PAY: "Zahlung vorschlagen", DENY: "Ablehnung vorschlagen", REQUEST_INFORMATION: "Unterlagen anfordern",
  ESCALATE_COMPLEX: "Komplexschaden eskalieren", REFER_SIU: "An SIU übergeben",
} as const;

function amount(value: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function ClaimsView() {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClaimDetail | null>(null);
  const [search, setSearch] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [taskText, setTaskText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const data = await api.claims();
    setClaims(data);
    setSelectedId((current) => current || data[0]?.claimId || null);
  };
  useEffect(() => { void load().catch((cause: Error) => setError(cause.message)); }, []);
  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    void api.claim(selectedId).then(setSelected).catch((cause: Error) => setError(cause.message));
  }, [selectedId]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return claims.filter((claim) => !needle || [claim.claimId, claim.customerName, claim.contractId, claim.title, claim.summary]
      .join(" ").toLowerCase().includes(needle));
  }, [claims, search]);
  const open = claims.filter((claim) => !["settled", "closed"].includes(claim.status)).length;
  const review = claims.filter((claim) => claim.status === "awaiting_human").length;
  const critical = claims.filter((claim) => claim.riskLevel === "critical").length;
  const pending = selected?.recommendations.find((recommendation) => ["pending_review", "blocked"].includes(recommendation.status));

  const update = async (operation: () => Promise<ClaimDetail>) => {
    setBusy(true); setError(null);
    try { setSelected(await operation()); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const decide = (decision: "approve" | "reject") => {
    if (!selected || !pending || !reviewNote.trim()) return;
    void update(() => api.reviewClaimAction(selected.claimId, pending.id, decision, reviewNote.trim(), crypto.randomUUID()))
      .then(() => setReviewNote(""));
  };
  const addTask = () => {
    if (!selected || !taskText.trim()) return;
    void update(() => api.createClaimTask(selected.claimId, {
      type: "EVIDENCE_REVIEW", description: taskText.trim(), assignedTo: selected.assignedTeam, idempotencyKey: crypto.randomUUID(),
    })).then(() => setTaskText(""));
  };

  return <div className="page claims-page">
    <section className="page-heading"><div><p className="eyebrow">SCHADEN · SYNTHETISCHE WORKSHOP-ERWEITERUNG</p><h1>Schadensteuerung</h1><p>KI bereitet Entscheidungen vor. Vertrag, Dokumente und menschliche Verantwortung bleiben sichtbar.</p></div><div className="policy-chip"><span className="safe" />Keine Zahlung oder Ablehnung durch dieses Demo-System</div></section>
    <section className="metrics" aria-label="Schadenübersicht">
      <article className="metric"><div className="metric-icon mint"><FileSearch size={18} /></div><div><span>Offene Schäden</span><strong>{open}</strong><small>in Bearbeitung</small></div></article>
      <article className="metric"><div className="metric-icon violet"><UserCheck size={18} /></div><div><span>Menschliche Prüfung</span><strong>{review}</strong><small>Entscheidung ausstehend</small></div></article>
      <article className="metric"><div className="metric-icon amber"><AlertTriangle size={18} /></div><div><span>Kritische Fälle</span><strong>{critical}</strong><small>Governance oder SIU</small></div></article>
    </section>
    {error && <div className="inline-error"><AlertTriangle size={15} />{error}<button onClick={() => setError(null)}><X size={13} /></button></div>}
    <section className="claims-workspace">
      <div className="claim-browser"><div className="claim-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Schaden, Kunde, Vertrag…" /></div>
        <div className="claim-list">{visible.map((claim) => <button key={claim.claimId} className={selectedId === claim.claimId ? "active" : ""} onClick={() => setSelectedId(claim.claimId)}>
          <span className={`claim-risk ${claim.riskLevel}`} /><span><strong>{claim.title}</strong><small>{claim.claimId} · {claim.customerName}</small><em>{statusLabel[claim.status]} · {amount(claim.reportedAmount, claim.currency)}</em></span><ChevronRight size={14} />
        </button>)}</div>
      </div>
      <div className="claim-detail">{selected ? <>
        <header className="claim-hero"><div><p>{selected.claimId} · {selected.scenario}</p><h2>{selected.title}</h2><span>{selected.customerName} · {selected.policyholderId}</span></div><div><span className={`claim-status ${selected.status}`}>{statusLabel[selected.status]}</span><small className={`risk-text ${selected.riskLevel}`}>{riskLabel[selected.riskLevel]}es Risiko</small></div></header>
        <div className="claim-warning"><ShieldCheck size={17} /><div><strong>Human-in-the-loop</strong><p>{selected.automationBoundary}</p></div></div>
        <div className="claim-facts">
          <span><small>Vertrag</small><strong>{selected.contractId}</strong></span><span><small>Tarifgeneration</small><strong>{selected.tariffGenerationId}</strong></span>
          <span><small>Schadentag</small><strong>{selected.eventDate}</strong></span><span><small>Gemeldet</small><strong>{dateTime(selected.notifiedAt)}</strong></span>
          <span><small>Gemeldet</small><strong>{amount(selected.reportedAmount, selected.currency)}</strong></span><span><small>Reserve</small><strong>{amount(selected.reserveAmount, selected.currency)}</strong></span>
          <span><small>Gezahlt (Historie)</small><strong>{amount(selected.paidAmount, selected.currency)}</strong></span><span><small>Team</small><strong>{selected.assignedTeam}</strong></span>
        </div>
        <section className="claim-panel"><header><FileText size={15} /><h3>Vertrag & Evidenz</h3></header><p>{selected.summary}</p><div className="document-links">{selected.policyDocumentIds.map((id) => <a key={id} href={`/api/tariffs/${id}/download`}><FileText size={13} />{id}</a>)}</div><small className="source-note">Quelle: {selected.sourceReference}. Kein echter Schadendatensatz.</small></section>
        <section className="claim-panel"><header><Scale size={15} /><h3>Entscheidungsempfehlung</h3></header>{selected.recommendations.map((recommendation) => <article className={`recommendation ${recommendation.status}`} key={recommendation.id}><div><strong>{actionLabel[recommendation.action]}</strong><span>{Math.round(recommendation.confidence * 100)} % · {recommendation.ruleVersion}</span></div><p>{recommendation.rationale}</p><small>{recommendation.proposedBy} · {recommendation.status}</small>{recommendation.reviewerNote && <blockquote>{recommendation.reviewerNote}</blockquote>}</article>)}
          {pending && <div className="claim-review"><label>Prüfvermerk<textarea rows={2} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Begründete menschliche Entscheidung…" /></label><div><button disabled={busy || !reviewNote.trim()} onClick={() => decide("reject")}><X size={14} />Zurückweisen</button><button className="primary-button" disabled={busy || !reviewNote.trim() || pending.status === "blocked"} title={pending.status === "blocked" ? "Blockierte Empfehlung muss zurückgewiesen und korrigiert werden" : undefined} onClick={() => decide("approve")}><Check size={14} />Intern freigeben</button></div></div>}
        </section>
        <section className="claim-panel"><header><ClipboardCheck size={15} /><h3>Aufgaben</h3><span>{selected.tasks.filter((task) => task.status === "open").length} offen</span></header>{selected.tasks.map((task) => <div className="claim-task" key={task.id}><span /><div><strong>{task.type}</strong><p>{task.description}</p><small>{task.assignedTo || "Nicht zugewiesen"}{task.dueAt ? ` · fällig ${dateTime(task.dueAt)}` : ""}</small></div></div>)}<div className="task-composer"><input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="Interne Prüfaufgabe hinzufügen…" /><button disabled={busy || !taskText.trim()} onClick={addTask}>Hinzufügen</button></div></section>
        <section className="claim-panel claim-audit"><header><RefreshCw size={15} /><h3>Audit Trail</h3></header>{selected.events.map((event) => <div key={event.id}><span /><p><strong>{event.type}</strong><small>{event.actor} · {dateTime(event.createdAt)}</small></p></div>)}</section>
      </> : <div className="empty-state"><RefreshCw className="spin" /><h3>Schaden wird geladen</h3></div>}</div>
    </section>
  </div>;
}
