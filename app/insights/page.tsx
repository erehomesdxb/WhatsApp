"use client";
import { useEffect, useState } from "react";
import { Icon, IC, PageHead, downloadCSV } from "@/lib/ui";
import { supabaseBrowser } from "@/lib/supabase";

const RANGES: [string, string, number][] = [["7d", "7 days", 7], ["30d", "30 days", 30], ["90d", "90 days", 90]];

type Perf = { name: string; sent: number; replyRate: number };
type DeliveryRow = { label: string; n: number };

export default function Insights() {
  const [range, setRange] = useState("30d");
  const [kpi, setKpi] = useState<{ sent: string; delivery: string; read: string; reply: string; leads: string }>({ sent: "—", delivery: "—", read: "—", reply: "—", leads: "—" });
  const [perf, setPerf] = useState<Perf[] | null>(null);
  const [delivery, setDelivery] = useState<DeliveryRow[] | null>(null);

  // Everything here is live: messaging totals from Twilio, template reply rates
  // from our message log, lead counts from Supabase. Nothing is seeded.
  useEffect(() => {
    const days = RANGES.find((r) => r[0] === range)?.[2] ?? 30;
    let on = true;
    setPerf(null);
    setDelivery(null);

    fetch(`/api/insights?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        const t = d?.totals;
        if (!t) return;
        const reached = (t.delivered || 0) + (t.read || 0);
        setKpi((k) => ({
          ...k,
          sent: Number(t.outbound || 0).toLocaleString(),
          delivery: `${t.deliveryRate ?? 0}%`,
          read: `${t.readRate ?? 0}%`,
          reply: t.outbound ? `${Math.round(((t.inbound || 0) / t.outbound) * 100)}%` : "0%",
        }));
        setDelivery([
          { label: "Sent", n: t.outbound || 0 },
          { label: "Delivered", n: reached },
          { label: "Read", n: t.read || 0 },
          { label: "Failed / undelivered", n: (t.failed || 0) + (t.undelivered || 0) },
          { label: "Inbound replies", n: t.inbound || 0 },
        ]);
      })
      .catch(() => { if (on) setDelivery([]); });

    // Template reply rates (last 90 days, server-computed) + names.
    Promise.all([
      fetch("/api/templates/performance").then((r) => r.json()).catch(() => ({})),
      fetch("/api/templates").then((r) => r.json()).catch(() => ({})),
    ]).then(([p, tpl]) => {
      if (!on) return;
      const stats = p?.stats || {};
      const names: Record<string, string> = {};
      for (const t of tpl?.templates || []) names[t.sid] = t.name;
      const rows: Perf[] = Object.entries(stats)
        .map(([sid, s]: [string, any]) => ({ name: names[sid] || sid, sent: s.sent || 0, replyRate: s.replyRate || 0 }))
        .sort((a, b) => b.replyRate - a.replyRate || b.sent - a.sent)
        .slice(0, 8);
      setPerf(rows);
    });

    // Leads created (conversations marked hot/warm/won).
    supabaseBrowser()
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .in("lead_status", ["hot", "warm", "won"])
      .then(({ count }) => { if (on && typeof count === "number") setKpi((k) => ({ ...k, leads: count.toLocaleString() })); });

    return () => { on = false; };
  }, [range]);

  const exportCSV = () => {
    const rows: (string | number)[][] = [["Section", "Name", "Value 1", "Value 2"]];
    (delivery || []).forEach((d) => rows.push(["Delivery", d.label, d.n, ""]));
    (perf || []).forEach((t) => rows.push(["Template", t.name, `${t.sent} sent`, `${t.replyRate}% reply`]));
    downloadCSV(`ere-insights-${range}.csv`, rows);
  };

  const maxDelivery = Math.max(1, ...(delivery || []).map((d) => d.n));

  return (
    <div className="page"><div className="maxw">
      <PageHead title="Insights" sub="Live WhatsApp messaging performance from Twilio and your message log.">
        <div className="seg">
          {RANGES.map(([id, l]) => (
            <button key={id} className={range === id ? "on" : ""} onClick={() => setRange(id)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-sec" onClick={exportCSV}><Icon d={IC.dl} s={15} />Export</button>
      </PageHead>

      <div className="kpis k5">
        <div className="kpi"><div className="kl">Messages sent</div><div className="kv">{kpi.sent}</div></div>
        <div className="kpi"><div className="kl">Delivery rate</div><div className="kv">{kpi.delivery}</div></div>
        <div className="kpi"><div className="kl">Read rate</div><div className="kv">{kpi.read}</div></div>
        <div className="kpi"><div className="kl">Reply rate</div><div className="kv">{kpi.reply}</div></div>
        <div className="kpi"><div className="kl">Leads created</div><div className="kv">{kpi.leads}</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-t">Top templates</div><div className="card-meta">by reply rate</div></div>
          <div className="perf">
            {(perf || []).map((t) => (
              <div className="perf-row" key={t.name}>
                <div className="perf-name mono">{t.name}</div>
                <div className="perf-stat">{t.sent} sent</div>
                <div className="perf-stat strong">{t.replyRate}% reply</div>
              </div>
            ))}
            {perf === null && <div className="empty sm">Loading…</div>}
            {perf !== null && perf.length === 0 && <div className="empty sm">No template sends yet.</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-t">Delivery breakdown</div><div className="card-meta">this period</div></div>
          <div className="perf">
            {(delivery || []).map((d) => (
              <div className="perf-row" key={d.label} style={{ alignItems: "center" }}>
                <div className="perf-name" style={{ minWidth: 150 }}>{d.label}</div>
                <div style={{ flex: 1, background: "#EEEEEE", borderRadius: 6, height: 18, overflow: "hidden", margin: "0 10px" }}>
                  <div style={{ width: `${(d.n / maxDelivery) * 100}%`, height: "100%", background: "var(--green-dot)", minWidth: d.n ? 3 : 0, borderRadius: 6 }} />
                </div>
                <div className="perf-stat strong">{d.n.toLocaleString()}</div>
              </div>
            ))}
            {delivery === null && <div className="empty sm">Loading…</div>}
            {delivery !== null && delivery.length === 0 && <div className="empty sm">No messages in this range.</div>}
          </div>
        </div>
      </div>
    </div></div>
  );
}
