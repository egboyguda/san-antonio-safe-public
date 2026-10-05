"use client";

import {
  BarChart3,
  Clock3,
  LoaderCircle,
  Map,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IncidentMap } from "@/components/incident-map";
import { formatDuration } from "@/lib/dashboard/format";
import type { Analytics, HeatmapData } from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

export function AnalyticsClient() {
  const analytics = usePollingQuery<Analytics>("/api/dashboard/analytics", 0);
  const heatmap = usePollingQuery<HeatmapData>("/api/dashboard/heatmap", 0);
  const loading = analytics.loading || heatmap.loading;
  const refreshing = analytics.refreshing || heatmap.refreshing;

  function refresh() {
    void analytics.refresh(true);
    void heatmap.refresh(true);
  }

  const barangayData = (analytics.data?.incidentsPerBarangay ?? [])
    .slice(0, 10)
    .map((item) => ({ name: item.barangay ?? "Unspecified", incidents: item.count }));
  const categoryData = (analytics.data?.commonIncidentTypes ?? [])
    .slice(0, 8)
    .map((item) => ({ name: item.category ?? "Unknown", incidents: item.count }));
  const monthlyData = (analytics.data?.monthlyTrend ?? []).map((item) => ({
    month: new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit", timeZone: "Asia/Manila" }).format(new Date(`${item.month}-01T00:00:00+08:00`)),
    incidents: item.count,
  }));
  const total = barangayData.reduce((sum, item) => sum + Number(item.incidents), 0);
  const busiest = barangayData[0];
  const common = categoryData[0];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow"><BarChart3 size={15} /> Operational intelligence</span>
          <h1>Analytics and trends</h1>
          <p>All-time incident patterns for planning, readiness, and evaluation.</p>
        </div>
        <button className="secondary-button" onClick={refresh} disabled={refreshing}>
          {refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Refresh analytics
        </button>
      </header>
      {(analytics.error || heatmap.error) && <div className="inline-alert error">{analytics.error ?? heatmap.error}</div>}

      <section className="analytics-kpis">
        <article className="metric-card"><span className="summary-icon teal"><Clock3 size={20} /></span><div><span>Average response</span><strong>{formatDuration(analytics.data?.averageResponseSeconds ?? null)}</strong><small>Report to resolution</small></div></article>
        <article className="metric-card"><span className="summary-icon blue"><TrendingUp size={20} /></span><div><span>Incidents analyzed</span><strong>{loading ? "?" : total.toLocaleString()}</strong><small>All recorded reports</small></div></article>
        <article className="metric-card"><span className="summary-icon amber"><Map size={20} /></span><div><span>Highest activity</span><strong>{busiest?.name ?? "No data"}</strong><small>{busiest ? `${busiest.incidents} reports` : "No barangay data"}</small></div></article>
        <article className="metric-card"><span className="summary-icon red"><BarChart3 size={20} /></span><div><span>Most common type</span><strong>{common?.name ?? "No data"}</strong><small>{common ? `${common.incidents} reports` : "No category data"}</small></div></article>
      </section>

      <section className="analytics-grid">
        <article className="panel chart-panel wide">
          <div className="panel-heading"><div><h2>Monthly incident trend</h2><p>Volume of reports received over time</p></div></div>
          <div className="chart-container">
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebef" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dce4e9" }} />
                  <Line type="monotone" dataKey="incidents" stroke="#0f7c7d" strokeWidth={3} dot={{ r: 4, fill: "#0f7c7d" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="empty-inline">Monthly trend data will appear after incidents are reported.</div>}
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading"><div><h2>Reports by barangay</h2><p>Areas with the highest incident volume</p></div></div>
          <div className="chart-container tall">
            {barangayData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barangayData} layout="vertical" margin={{ left: 15, right: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6ebef" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={85} tickLine={false} axisLine={false} tick={{ fill: "#526171", fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#f4f7f8" }} contentStyle={{ borderRadius: 10, borderColor: "#dce4e9" }} />
                  <Bar dataKey="incidents" fill="#176c7a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-inline">No barangay data yet.</div>}
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading"><div><h2>Common incident types</h2><p>Most frequently reported categories</p></div></div>
          <div className="chart-container tall">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6ebef" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tickLine={false} axisLine={false} tick={{ fill: "#526171", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "#f4f7f8" }} contentStyle={{ borderRadius: 10, borderColor: "#dce4e9" }} />
                  <Bar dataKey="incidents" fill="#df7d36" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-inline">No incident category data yet.</div>}
          </div>
        </article>
      </section>

      <section className="panel heatmap-panel">
        <div className="panel-heading">
          <div><h2>Incident concentration heatmap</h2><p>Aggregated report density in approximate 1 km grid cells</p></div>
          <span className="count-pill">{heatmap.data?.points.length ?? 0} activity cells</span>
        </div>
        <IncidentMap heatPoints={heatmap.data?.points ?? []} />
        <div className="heat-legend"><span>Lower activity</span><i /><i /><i /><i /><span>Higher activity</span></div>
      </section>
    </div>
  );
}
