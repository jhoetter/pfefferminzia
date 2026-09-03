import type { ProductLine, TicketCategory, TicketPriority, TicketStatus } from "./types";

export const statusLabel: Record<TicketStatus, string> = {
  new: "Neu",
  in_progress: "In Bearbeitung",
  awaiting_human: "Menschliche Prüfung",
  scheduled: "Geplant",
  sent: "Gesendet",
  closed: "Abgeschlossen",
};

export const productLabel: Record<ProductLine, string> = {
  unknown: "Ungeklärt",
  liability: "Haftpflicht",
  life: "Leben",
};

export const categoryLabel: Record<TicketCategory, string> = {
  unknown: "Nicht klassifiziert",
  general_question: "Allgemeine Frage",
  coverage_question: "Deckungsfrage",
  claim: "Schadensfall",
  contract_change: "Vertragsänderung",
  cancellation: "Kündigung",
  complaint: "Beschwerde",
};

export const priorityLabel: Record<TicketPriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  urgent: "Dringend",
};

export function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86_400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86_400), "day");
}

export const dateTime = (value: string) => new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export const fileSize = (bytes: number) => bytes < 1024
  ? `${bytes} B`
  : bytes < 1_048_576
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1_048_576).toFixed(1)} MB`;
