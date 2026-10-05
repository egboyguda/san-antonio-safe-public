"use client";

import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  FileWarning,
  LoaderCircle,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Siren,
  UsersRound,
} from "lucide-react";
import { IncidentMap } from "@/components/incident-map";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/dashboard/format";
import type { Incident, MapIncident, Summary } from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

const cardConfig = [
  { key: "totalReports", label: "Total reports", icon: FileWarning, tone: "navy" },
  { key: "pendingReports", label: "Pending review", icon: Clock3, tone: "amber" },
  { key: "activeIncidents", label: "Active incidents", icon: Siren, tone: "red" },
  { key: "resolvedIncidents", label: "Resolved", icon: CheckCircle2, tone: "green" },
  { key: "alertsSent", label: "Alerts sent", icon: BellRing, tone: "blue" },
  { key: "availableResponders", label: "Responders ready", icon: UsersRound, tone: "teal" },
] as const;

export function OverviewClient() {
  const summary = usePollingQuery<Summary>("/api/dashboard/summary");
  const recent = usePollingQuery<{
    incidents: Incident[];
    pagination: { total: number };
  }>("/api/incidents?limit=6");
  const map = usePollingQuery<{ incidents: MapIncident[] }>("/api/dashboard/map");

  const lastUpdated = [summary.lastUpdated, recent.lastUpdated, map.lastUpdated]
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a))[0];
  const error = summary.error || recent.error || map.error;
  const refreshing = summary.refreshing || recent.refreshing || map.refreshing;

  function refreshAll() {
    void summary.refresh(true);
    void recent.refresh(true);
    void map.refresh(true);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow"><RadioTower size={15} /> Live operations</span>
          <h1>Command overview</h1>
          <p>Monitor municipal emergency activity and coordinate the next response.</p>
        </div>
        <div className="header-actions">
          <span className="updated-copy">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "Connecting?"}
          </span>
          <button className="secondary-button" onClick={refreshAll} disabled={refreshing}>
            {refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="inline-alert error"><ShieldAlert size={18} /> {error}. Showing the latest available data.</div>
      )}

      <section className="summary-grid" aria-label="Operations summary">
        {cardConfig.map(({ key, label, icon: Icon, tone }) => (
          <article className="summary-card" key={key}>
            <span className={`summary-icon ${tone}`}><Icon size={20} /></span>
            <div>
              <span>{label}</span>
              {summary.loading ? <span className="skeleton skeleton-number" /> : <strong>{summary.data?.[key] ?? 0}</strong>}
            </div>
          </article>
        ))}
      </section>

      <section className="overview-grid">
        <article className="panel map-panel">
          <div className="panel-heading">
            <div><h2>Active incident map</h2><p>Current reports requiring operational awareness</p></div>
            <Link href="/dashboard/map" className="text-link">Open full map ?</Link>
          </div>
          <IncidentMap incidents={(map.data?.incidents ?? []).slice(0, 60)} compact />
          <div className="map-legend">
            <span><i className="legend-dot pending" /> Pending</span>
            <span><i className="legend-dot responding" /> Active</span>
            <span><i className="legend-dot assigned" /> Assigned</span>
            <span><i className="legend-dot resolved" /> Resolved</span>
          </div>
        </article>

        <aside className="quick-panel panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Common command tasks</p></div></div>
          <Link href="/dashboard/incidents?status=pending" className="quick-action urgent">
            <span><Clock3 size={20} /></span><div><strong>Review pending reports</strong><small>Verify or reject new submissions</small></div>
          </Link>
          <Link href="/dashboard/alerts?compose=true" className="quick-action">
            <span><BellRing size={20} /></span><div><strong>Broadcast an alert</strong><small>Notify residents by area or role</small></div>
          </Link>
          <Link href="/dashboard/incidents?status=verified" className="quick-action">
            <span><UsersRound size={20} /></span><div><strong>Dispatch responders</strong><small>Assign a team and response vehicle</small></div>
          </Link>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><h2>Recent incident reports</h2><p>Newest reports across San Antonio</p></div>
          <Link href="/dashboard/incidents" className="text-link">View all incidents ?</Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Incident</th><th>Barangay</th><th>Severity</th><th>Status</th><th>Reported</th><th /></tr></thead>
            <tbody>
              {(recent.data?.incidents ?? []).map((incident) => (
                <tr key={incident.id}>
                  <td><strong>{incident.title}</strong><small>{incident.incidentCategoryName}</small></td>
                  <td>{incident.barangayName ?? "Unspecified"}</td>
                  <td><SeverityBadge severity={incident.severityLevel} /></td>
                  <td><StatusBadge status={incident.status} /></td>
                  <td>{formatDate(incident.reportedAt)}</td>
                  <td><Link href={`/dashboard/incidents/${incident.id}`} className="row-link">Open</Link></td>
                </tr>
              ))}
              {!recent.loading && !recent.data?.incidents.length && (
                <tr><td colSpan={6}><div className="empty-inline">No incident reports yet.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
