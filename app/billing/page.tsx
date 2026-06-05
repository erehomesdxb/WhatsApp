"use client";
import { useEffect, useState } from "react";
import { Icon, IC, PageHead, downloadCSV } from "@/lib/ui";

const TWILIO_BILLING = "https://console.twilio.com/us1/billing/manage-billing/billing-overview";

type Data = {
  balance: { balance: string; currency: string } | null;
  range: { days: number; since: string };
  spend: { total: number; allTime: number; avgPerDay: number; currency: string };
  byDay: { day: string; spend: number }[];
};

export default function Billing() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  // Live Twilio balance + spend (Usage Records). No seeded numbers — detailed
  // invoices and payment method are managed in the Twilio Console.
  useEffect(() => {
    fetch("/api/billing?days=30")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sym = (c?: string) => (c === "USD" || !c ? "$" : c + " ");
  const balance = data?.balance ? `${sym(data.balance.currency)}${parseFloat(data.balance.balance).toFixed(2)}` : "—";
  const spend = data?.spend;
  const cur = spend?.currency || data?.balance?.currency;
  const byDay = data?.byDay || [];
  const maxDay = Math.max(0.0001, ...byDay.map((d) => d.spend));

  const exportStatement = () => {
    const rows: (string | number)[][] = [["Date", `Spend (${cur || "USD"})`]];
    byDay.forEach((d) => rows.push([d.day, d.spend.toFixed(4)]));
    if (spend) rows.push(["Total", spend.total.toFixed(2)]);
    downloadCSV("ere-billing-statement.csv", rows);
  };

  return (
    <div className="page"><div className="maxw">
      <PageHead title="Billing & usage" sub="Live Twilio balance and spend for this project. Invoices and payment method are managed in the Twilio Console.">
        <button className="btn btn-sec" onClick={exportStatement} disabled={!byDay.length}><Icon d={IC.dl} s={15} />Download statement</button>
        <a className="btn btn-primary" href={TWILIO_BILLING} target="_blank" rel="noreferrer"><Icon d={IC.plus} s={16} />Add funds</a>
      </PageHead>

      {loading && <div className="empty sm">Loading…</div>}

      {!loading && (
        <>
          <div className="kpis k4">
            <div className="kpi"><div className="kl">Account balance</div><div className="kv">{balance}</div><div className="ks">live Twilio balance</div></div>
            <div className="kpi"><div className="kl">Spend · last {data?.range.days ?? 30}d</div><div className="kv">{spend ? `${sym(cur)}${spend.total.toFixed(2)}` : "—"}</div></div>
            <div className="kpi"><div className="kl">Avg / day</div><div className="kv">{spend ? `${sym(cur)}${spend.avgPerDay.toFixed(2)}` : "—"}</div></div>
            <div className="kpi"><div className="kl">Spend · all time</div><div className="kv">{spend ? `${sym(cur)}${spend.allTime.toFixed(2)}` : "—"}</div></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head"><div className="card-t">Spend by day</div><div className="card-meta">since {data?.range.since}</div></div>
              {byDay.length === 0 ? (
                <div className="empty sm">No spend recorded in this range yet.</div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150, paddingTop: 10 }}>
                  {byDay.map((d) => (
                    <div key={d.day} style={{ flex: 1, textAlign: "center" }} title={`${d.day}: ${sym(cur)}${d.spend.toFixed(2)}`}>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 120 }}>
                        <div style={{ height: `${(d.spend / maxDay) * 100}%`, background: "var(--green-dot)", minHeight: d.spend > 0 ? 2 : 0, borderRadius: "3px 3px 0 0" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{d.day.slice(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-head"><div className="card-t">Payment & invoices</div></div>
              <div className="paycard">
                <div className="pc-row"><span className="pc-brand"><Icon d={IC.card} s={18} /> Twilio billing</span></div>
                <div className="pc-meta">Payment method, auto-recharge and downloadable invoices live in the Twilio Console.</div>
              </div>
              <div className="recharge">
                <div className="rc-meta">Top up your balance or change billing settings directly in Twilio.</div>
                <a className="btn btn-sec btn-sm" style={{ marginTop: 12 }} href={TWILIO_BILLING} target="_blank" rel="noreferrer">Open Twilio billing ↗</a>
              </div>
            </div>
          </div>
        </>
      )}
    </div></div>
  );
}
