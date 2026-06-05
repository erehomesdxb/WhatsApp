"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, IC, PageHead } from "@/lib/ui";
import { supabaseBrowser } from "@/lib/supabase";
import { CAMP_STATUS, type CampaignRow } from "@/lib/types";

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function fmtDate(c: CampaignRow) {
  const iso = c.status === "scheduled" ? c.finish_at || c.created_at : c.created_at;
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const TABS: [string, string][] = [["all", "All"], ["completed", "Sent"], ["scheduled", "Scheduled"], ["sending", "Sending"]];

export default function Campaigns() {
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState<CampaignRow[] | null>(null);

  // Live campaigns straight from the `campaigns` table. No seeded rows.
  useEffect(() => {
    const sb = supabaseBrowser();
    // Refresh active campaigns' counts from message statuses, then load.
    fetch("/api/campaign/refresh", { method: "POST" }).catch(() => {}).finally(() => {
      sb.from("campaigns").select("*").order("created_at", { ascending: false }).limit(200)
        .then(({ data }) => setRows((data as CampaignRow[]) || []));
    });
  }, []);

  const all = rows || [];
  const list = all.filter((c) => tab === "all" || c.status === tab);
  const messagesSent = all.reduce((a, c) => a + (c.sent || 0), 0);
  const scheduledCount = all.filter((c) => c.status === "scheduled").length;
  const sendingCount = all.filter((c) => c.status === "sending").length;

  return (
    <div className="page"><div className="maxw">
      <PageHead title="Campaigns" sub="Broadcast an approved template to a CRM segment, and track delivery from the campaign log.">
        <Link className="btn btn-sec" href="/campaigns/history"><Icon d={IC.insights} s={15} />Campaign log</Link>
        <Link className="btn btn-primary" href="/campaigns/new"><Icon d={IC.plus} s={16} />New campaign</Link>
      </PageHead>

      <div className="kpis k4">
        <div className="kpi"><div className="kl">Total campaigns</div><div className="kv">{rows ? all.length : "—"}</div></div>
        <div className="kpi"><div className="kl">Messages sent</div><div className="kv">{rows ? messagesSent.toLocaleString() : "—"}</div><div className="ks">all campaigns</div></div>
        <div className="kpi"><div className="kl">Scheduled</div><div className="kv">{rows ? scheduledCount : "—"}</div><div className="ks">upcoming</div></div>
        <div className="kpi"><div className="kl">Sending now</div><div className="kv">{rows ? sendingCount : "—"}</div></div>
      </div>

      <div className="bar">
        <div className="tabs">
          {TABS.map(([id, l]) => (
            <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>
              {l}<span className="cnt">{id === "all" ? all.length : all.filter((c) => c.status === id).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {rows === null ? (
          <div className="empty sm" style={{ padding: 28 }}>Loading…</div>
        ) : list.length > 0 ? (
          <table className="ttable">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Sent</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const s = CAMP_STATUS[c.status] || CAMP_STATUS.sending;
                const meta = [c.template_name, c.mode].filter(Boolean).join(" · ");
                return (
                  <tr key={c.id} className="norow">
                    <td><div className="camp-name"><div className="cn-t">{c.name}</div>{meta && <div className="cn-s mono">{meta}</div>}</div></td>
                    <td className="tcol-muted">{(c.total || 0).toLocaleString()}</td>
                    <td>{c.total ? <div className="prog"><div className="prog-bar"><div className="prog-fill" style={{ width: `${pct(c.sent, c.total)}%` }} /></div><span>{c.sent}/{c.total}</span></div> : <span className="tcol-muted">—</span>}</td>
                    <td><span className="badge" style={{ color: s.fg, background: s.bg, borderColor: s.bd }}><span className="bd" style={{ background: s.dot }} />{s.label}</span></td>
                    <td className="tcol-muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty"><div className="ei"><Icon d={IC.camp} s={22} /></div><h4>No campaigns here</h4><div>Create a campaign, or switch tabs to see others.</div></div>
        )}
      </div>
    </div></div>
  );
}
