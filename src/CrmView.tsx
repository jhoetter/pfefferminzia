import {
  BadgeCheck, Building2, ChevronRight, CircleUserRound, Database, FileKey2, House,
  Mail, MapPin, Phone, RefreshCw, Search, ShieldCheck, UserRound, UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { ContractDetail, CustomerDetail, CustomerSummary } from "./types";

const money = (value: number, currency: string) => new Intl.NumberFormat("de-DE", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(value);
const shortDate = (value: string | null) => value ? new Intl.DateTimeFormat("de-DE").format(new Date(`${value}T00:00:00Z`)) : "–";

export function CrmView() {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>("PTR-00000001");
  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.customers(query).then((items) => {
        setCustomers(items);
        if (!selectedId && items[0]) setSelectedId(items[0].partnerId);
      }).catch((cause: Error) => setError(cause.message)).finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    setContract(null);
    api.customer(selectedId).then(setSelected).catch((cause: Error) => setError(cause.message));
  }, [selectedId]);

  return <div className="page crm-page">
    <section className="page-heading crm-heading"><div><p className="eyebrow">CRM · SYNTHETISCHE WORKSHOP-DATEN</p><h1>Kunden 360°</h1><p>Partner, Verträge und Herkunftssysteme aus Falks reproduzierbarem Lehrdatensatz.</p></div><div className="source-chip"><Database size={14} /><span><strong>Falk Dataset S</strong><small>1.000 synthetische Partner</small></span></div></section>
    {error && <div className="crm-error">{error}</div>}
    <section className="crm-layout">
      <aside className="customer-browser">
        <div className="customer-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, PTR-, VTR-, Ort…" /></div>
        <div className="customer-browser-meta"><span>{customers.length} Treffer</span><em>Personas zuerst</em></div>
        <div className="customer-list">
          {loading ? <div className="customer-loading"><RefreshCw className="spin" size={17} />Kunden werden geladen</div> : customers.map((customer) => <button key={customer.partnerId} className={customer.partnerId === selectedId ? "active" : ""} onClick={() => setSelectedId(customer.partnerId)}>
            <span className={`customer-avatar ${customer.partnerType === "JURISTISCH" ? "company" : ""}`}>{customer.partnerType === "JURISTISCH" ? <Building2 /> : <UserRound />}</span>
            <span className="customer-list-copy"><strong>{customer.displayName}</strong><small>{customer.partnerId} · {customer.city || customer.country}</small><em>{customer.activeContractCount} aktive Verträge</em></span>
            {customer.isPersona && <span className="persona-dot" title="Workshop-Persona" />}
            <ChevronRight size={14} />
          </button>)}
        </div>
      </aside>
      <div className="customer-detail">
        {!selected ? <div className="customer-empty"><CircleUserRound /><h3>Kundenakte auswählen</h3></div> : <>
          <header className="customer-hero">
            <div className={`hero-avatar ${selected.partnerType === "JURISTISCH" ? "company" : ""}`}>{selected.partnerType === "JURISTISCH" ? <Building2 /> : <UserRound />}</div>
            <div className="hero-copy"><div><span>{selected.partnerId}</span>{selected.isPersona && <em>Workshop-Persona</em>}</div><h2>{selected.displayName}</h2><p>{selected.segment} · {selected.country} · Kunde seit {selected.contracts.at(-1)?.startDate.slice(0, 4) || "–"}</p></div>
            <div className="hero-status"><span className={selected.status === "AKTIV" ? "active" : ""}>{selected.status}</span><small>Quelle {selected.primarySystem}</small></div>
          </header>
          <div className="consent-strip"><span className={selected.aiConsent ? "allowed" : "blocked"}><ShieldCheck />KI-Nutzung {selected.aiConsent ? "erlaubt" : "nicht erlaubt"}</span><span className={selected.marketingConsent ? "allowed" : "blocked"}><BadgeCheck />Werbung {selected.marketingConsent ? "erlaubt" : "gesperrt"}</span><small>Fiktive Einwilligungen für Governance-Übungen</small></div>
          <div className="customer-grid">
            <section className="crm-card identity-card"><header><CircleUserRound /><h3>Stammdaten</h3></header><div className="identity-columns"><div><label>Geburtsdatum</label><strong>{shortDate(selected.birthDate)}</strong></div><div><label>Sprache</label><strong>{selected.language}</strong></div><div><label>Typ</label><strong>{selected.partnerType}</strong></div><div><label>Segment</label><strong>{selected.segment}</strong></div></div>
              <div className="contact-lines">{selected.contacts.map((item) => <div key={item.id}>{item.type === "EMAIL" ? <Mail /> : <Phone />}<span><small>{item.type}{item.primary ? " · primär" : ""}</small><strong>{item.value}</strong></span></div>)}{selected.addresses.filter((item) => item.current).map((item) => <div key={item.id}><MapPin /><span><small>Aktuelle Adresse</small><strong>{item.street} {item.houseNumber}, {item.postalCode} {item.city}</strong></span></div>)}</div>
            </section>
            <section className="crm-card relationship-card"><header><UsersRound /><h3>Beziehungen</h3><span>{selected.relationships.length}</span></header>{selected.relationships.length ? selected.relationships.map((item) => <button key={`${item.direction}-${item.partnerId}`} onClick={() => setSelectedId(item.partnerId)}><span><strong>{item.displayName}</strong><small>{item.relationship} · {item.partnerId}</small></span><ChevronRight /></button>) : <p className="card-empty">Keine Beziehungen hinterlegt</p>}</section>
            <section className="crm-card contracts-card"><header><FileKey2 /><h3>Verträge</h3><span>{selected.contracts.length}</span></header><div className="contract-list">{selected.contracts.map((item) => <button key={item.contractId} className={contract?.contractId === item.contractId ? "active" : ""} onClick={() => api.contract(item.contractId).then(setContract)}><span className={`contract-line ${item.line.toLowerCase()}`}>{item.line}</span><span><strong>{item.productName}</strong><small>{item.contractId} · {item.tariffGenerationId}</small><em>{money(item.annualPremium, item.currency)} p. a. · Summe {money(item.insuredSum, item.currency)}</em></span><span className={`contract-status ${item.status === "AKTIV" ? "active" : ""}`}>{item.status}</span><ChevronRight /></button>)}</div>
              {contract && <div className="contract-inspector"><header><div><span>Vertragsdetails</span><strong>{contract.contractId}</strong></div><button onClick={() => setContract(null)}>Schließen</button></header><div className="contract-facts"><span><small>Beginn</small><strong>{shortDate(contract.startDate)}</strong></span><span><small>Zahlweise</small><strong>{contract.paymentFrequency}</strong></span><span><small>Kanal</small><strong>{contract.channel}</strong></span><span><small>Sachbearbeitung</small><strong>{contract.handlerId || "–"}</strong></span></div><h4>Deckungen</h4>{contract.coverages.map((coverage) => <div className="coverage-row" key={coverage.id}><span><strong>{coverage.component || coverage.type}</strong><small>{coverage.id}</small></span><em>{coverage.sum != null ? money(coverage.sum, contract.currency) : "eingeschlossen"}{coverage.deductible != null ? ` · SB ${money(coverage.deductible, contract.currency)}` : ""}</em></div>)}</div>}
            </section>
            <section className="crm-card provenance-card"><header><Database /><h3>Datenherkunft</h3><span>{selected.sourceReferences.length}</span></header>{selected.sourceReferences.map((item) => <div key={`${item.system}-${item.sourceId}`}><span className="system-badge">{item.system}</span><span><strong>{item.sourceId}</strong><small>{item.matchMethod} · Score {item.matchScore.toFixed(2)}</small></span></div>)}</section>
            <section className="crm-card timeline-card"><header><House /><h3>Kundenhistorie</h3><span>{selected.timeline.length}</span></header>{selected.timeline.slice(0, 8).map((item) => <div key={item.id}><time>{shortDate(item.date.slice(0, 10))}</time><span /><p><strong>{item.title}</strong><small>{item.detail}</small></p></div>)}</section>
          </div>
        </>}
      </div>
    </section>
  </div>;
}
