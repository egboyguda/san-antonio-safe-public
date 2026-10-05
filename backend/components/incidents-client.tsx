"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FilterX,
  LoaderCircle,
  RefreshCw,
  Search,
  Siren,
} from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { formatDate, titleCase } from "@/lib/dashboard/format";
import type {
  Incident,
  IncidentStatus,
  ReferenceData,
  Severity,
} from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

const PAGE_SIZE = 20;

export function IncidentsClient() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [severity, setSeverity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [page, setPage] = useState(0);
  const reference = usePollingQuery<ReferenceData>("/api/reference", 0);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (deferredSearch.trim()) params.set("q", deferredSearch.trim());
    if (status) params.set("status", status);
    if (severity) params.set("severityLevel", severity);
    if (categoryId) params.set("categoryId", categoryId);
    if (barangayId) params.set("barangayId", barangayId);
    return `/api/incidents?${params}`;
  }, [barangayId, categoryId, deferredSearch, page, severity, status]);

  const result = usePollingQuery<{
    incidents: Incident[];
    pagination: { total: number; limit: number | null; offset: number };
  }>(url);
  const total = result.data?.pagination.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = Boolean(search || status || severity || categoryId || barangayId);

  function reset() {
    setSearch("");
    setStatus("");
    setSeverity("");
    setCategoryId("");
    setBarangayId("");
    setPage(0);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow"><Siren size={15} /> Incident operations</span>
          <h1>Incident reports</h1>
          <p>Review, verify, assign, and track every emergency report.</p>
        </div>
        <button className="secondary-button" onClick={() => void result.refresh(true)} disabled={result.refreshing}>
          {result.refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Refresh
        </button>
      </header>

      <section className="panel filter-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Search title, description, or location?"
            aria-label="Search incidents"
          />
        </div>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {(reference.data?.incidentStatuses ?? []).map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
        <select value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(0); }} aria-label="Filter by severity">
          <option value="">All severities</option>
          {(reference.data?.severityLevels ?? []).map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
        <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(0); }} aria-label="Filter by category">
          <option value="">All categories</option>
          {(reference.data?.incidentCategories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={barangayId} onChange={(event) => { setBarangayId(event.target.value); setPage(0); }} aria-label="Filter by barangay">
          <option value="">All barangays</option>
          {(reference.data?.barangays ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {filtersActive && <button className="clear-button" onClick={reset}><FilterX size={16} /> Clear</button>}
      </section>

      {result.error && <div className="inline-alert error">{result.error}</div>}

      <section className="panel incident-list-panel">
        <div className="panel-heading">
          <div>
            <h2>{result.loading ? "Loading reports?" : `${total.toLocaleString()} reports`}</h2>
            <p>{filtersActive ? "Matching the current filters" : "All reports, newest first"}</p>
          </div>
          {result.lastUpdated && <span className="updated-copy">Updated {result.lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</span>}
        </div>
        <div className="table-wrap">
          <table className="data-table incidents-table">
            <thead><tr><th>Report</th><th>Location</th><th>Severity</th><th>Status</th><th>Responder</th><th>Reported</th><th /></tr></thead>
            <tbody>
              {(result.data?.incidents ?? []).map((incident) => (
                <tr key={incident.id}>
                  <td>
                    <strong>{incident.title}</strong>
                    <small>{incident.incidentCategoryName} ? {incident.reporterName}</small>
                  </td>
                  <td><strong className="cell-regular">{incident.barangayName ?? "Unspecified"}</strong><small>{incident.approximateAddress ?? "No address supplied"}</small></td>
                  <td><SeverityBadge severity={incident.severityLevel as Severity} /></td>
                  <td><StatusBadge status={incident.status as IncidentStatus} /></td>
                  <td>{incident.assignedResponderName ? <><strong className="cell-regular">{incident.assignedResponderName}</strong><small>{incident.assignedResponderTeam}</small></> : <span className="muted">Unassigned</span>}</td>
                  <td>{formatDate(incident.reportedAt)}</td>
                  <td><Link className="row-link" href={`/dashboard/incidents/${incident.id}`}>Open</Link></td>
                </tr>
              ))}
              {result.loading && Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}><td colSpan={7}><div className="skeleton skeleton-row" /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result.loading && !result.data?.incidents.length && (
          <div className="empty-state">
            <span><Search size={24} /></span>
            <h3>No incident reports found</h3>
            <p>Adjust the filters or clear the search to see more reports.</p>
            {filtersActive && <button className="secondary-button" onClick={reset}>Clear filters</button>}
          </div>
        )}
        {total > 0 && (
          <footer className="pagination">
            <span>Showing {page * PAGE_SIZE + 1}?{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
            <div>
              <button onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={17} /></button>
              <span>Page {page + 1} of {pages}</span>
              <button onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} disabled={page >= pages - 1} aria-label="Next page"><ChevronRight size={17} /></button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}
