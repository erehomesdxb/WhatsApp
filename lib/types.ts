/* Shared UI types and constants. No sample/seed data lives here — every screen
   reads live data from Twilio / Supabase. */

// A WhatsApp Content template, shaped exactly like /api/templates returns.
export type Tpl = {
  sid: string;
  name: string;
  language: string;
  type: string | null;
  category: string | null;
  status: string;
  rejection_reason: string | null;
  variables: Record<string, string>;
  body: string | null;
  replyButtons: string[];
  updated: string;
};

// A WhatsApp sender number for the "send from" switcher.
export type Sender = { id: string; sub: string; label: string; number: string };

// A campaign row, shaped like the `campaigns` table in Supabase.
export type CampaignRow = {
  id: string;
  name: string;
  template_name: string | null;
  sender: string | null;
  mode: string;
  total: number;
  sent: number;
  scheduled: number;
  failed: number;
  skipped: number;
  status: string; // sending | scheduled | completed | canceled
  finish_at: string | null;
  created_at: string;
};

// Status pill styling, keyed by the real campaign status values.
export const CAMP_STATUS: Record<string, { label: string; fg: string; bg: string; bd: string; dot: string }> = {
  completed: { label: "Sent", fg: "#fff", bg: "var(--green-dot)", bd: "var(--green-dot)", dot: "rgba(255,255,255,.9)" },
  sending: { label: "Sending", fg: "#fff", bg: "var(--blue)", bd: "var(--blue)", dot: "rgba(255,255,255,.9)" },
  scheduled: { label: "Scheduled", fg: "#fff", bg: "var(--amber-dot)", bd: "var(--amber-dot)", dot: "rgba(255,255,255,.9)" },
  canceled: { label: "Canceled", fg: "#fff", bg: "var(--ink-3)", bd: "var(--ink-3)", dot: "rgba(255,255,255,.9)" },
};
