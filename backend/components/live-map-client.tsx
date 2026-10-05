"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, MapPinned, RefreshCw } from "lucide-react";
import { IncidentMap } from "@/components/incident-map";
import { titleCase } from "@/lib/dashboard/format";
import type { MapIncident, ReferenceData } from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

export function LiveMapClient() {
  const map = usePollingQuery<{ incidents: MapIncident[] }>("/api/dashboard/map");
  const reference = usePollingQuery<ReferenceData>("/api/reference", 0);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [barangayId, setBarangayId] = useState("");

  const incidents = useMemo(
    () => (map.data?.incidents ?? []).filter((item) =>
      (!status || item.status === status) &&
      (!severity || item.severityLevel === severity) &&
      (!barangayId || item.barangayId === barangayId),
    ),
    [barangayId, map.data?.incidents, severity, status],
  );

  return (
    <div className="page-stack map-page">
      <header className="page-header">
        <div>
          <span className="eyebrow"><MapPinned size={15} /> Geographic operations</span>
          <h1>Live incident map</h1>
          <p>Locate active reports and understand their operational status at a glance.</p>
        </div>
        <button className="secondary-button" onClick={() => void map.refresh(true)} disabled={map.refreshing}>
          {map.refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Refresh map
        </button>
      </header>
      <section className="panel map-toolbar">
        <div><strong>{incidents.length}</strong><span>visible incidents</span></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {(reference.data?.incidentStatuses ?? []).filter((item) => !["archived", "rejected"].includes(item)).map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
        <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">All severities</option>
          {(reference.data?.severityLevels ?? []).map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
        <select value={barangayId} onChange={(event) => setBarangayId(event.target.value)}>
          <option value="">All barangays</option>
          {(reference.data?.barangays ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {(status || severity || barangayId) && <button className="clear-button" onClick={() => { setStatus(""); setSeverity(""); setBarangayId(""); }}>Clear filters</button>}
      </section>
      {map.error && <div className="inline-alert error">{map.error}</div>}
      <section className="panel full-map-panel">
        <IncidentMap incidents={incidents} />
        <div className="map-footer">
          <div className="map-legend">
            <span><i className="legend-dot pending" /> Pending verification</span>
            <span><i className="legend-dot responding" /> Responding</span>
            <span><i className="legend-dot assigned" /> Assigned</span>
            <span><i className="legend-dot resolved" /> Resolved</span>
          </div>
          <span className="updated-copy">{map.lastUpdated ? `Updated ${map.lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : "Loading live data?"}</span>
        </div>
      </section>
    </div>
  );
}
