"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardPenLine,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShieldAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { IncidentMap } from "@/components/incident-map";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/dashboard/api";
import {
  formatDate,
  NEXT_STATUSES,
  STATUS_LABELS,
  titleCase,
} from "@/lib/dashboard/format";
import type {
  IncidentDetail,
  IncidentStatus,
  ReferenceData,
  Responder,
} from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

type Modal = { type: "status"; status: IncidentStatus } | { type: "assign" } | null;

export function IncidentDetailClient({ id }: { id: string }) {
  const detail = usePollingQuery<IncidentDetail>(`/api/incidents/${id}`);
  const responders = usePollingQuery<{ responders: Responder[] }>("/api/responders", 15_000);
  const reference = usePollingQuery<ReferenceData>("/api/reference", 0);
  const [modal, setModal] = useState<Modal>(null);
  const [remarks, setRemarks] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const incident = detail.data?.incident;

  const [edit, setEdit] = useState({
    title: "",
    description: "",
    severityLevel: "moderate",
    barangayId: "",
    responderRemarks: "",
  });
  const [assignment, setAssignment] = useState({
    responderId: "",
    assignedVehicle: "",
    etaMinutes: "",
    notes: "",
  });

  useEffect(() => {
    if (!incident) return;
    const timer = window.setTimeout(() => {
      setEdit({
        title: incident.title,
        description: incident.description,
        severityLevel: incident.severityLevel,
        barangayId: incident.barangayId ?? "",
        responderRemarks: incident.responderRemarks ?? "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [incident]);

  const availableResponders = useMemo(
    () => (responders.data?.responders ?? []).filter(
      (item) => item.isAvailable || item.id === incident?.assignedResponderId,
    ),
    [incident?.assignedResponderId, responders.data?.responders],
  );

  async function refreshAll() {
    await Promise.all([detail.refresh(true), responders.refresh(true)]);
  }

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!modal || modal.type !== "status") return;
    if (modal.status === "rejected" && !remarks.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    setWorking(true);
    setActionError(null);
    try {
      await apiFetch(`/api/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: modal.status, remarks: remarks.trim() || undefined }),
      });
      setModal(null);
      setRemarks("");
      await refreshAll();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function assignResponder(event: FormEvent) {
    event.preventDefault();
    if (!assignment.responderId) return;
    setWorking(true);
    setActionError(null);
    try {
      await apiFetch(`/api/incidents/${id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          responderId: assignment.responderId,
          assignedVehicle: assignment.assignedVehicle.trim() || null,
          etaMinutes: assignment.etaMinutes ? Number(assignment.etaMinutes) : undefined,
          notes: assignment.notes.trim() || null,
        }),
      });
      setModal(null);
      setAssignment({ responderId: "", assignedVehicle: "", etaMinutes: "", notes: "" });
      await refreshAll();
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function saveIncident(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setActionError(null);
    try {
      await apiFetch(`/api/incidents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...edit,
          barangayId: edit.barangayId || null,
          responderRemarks: edit.responderRemarks || null,
        }),
      });
      await detail.refresh(true);
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (detail.loading && !detail.data) {
    return <div className="page-stack"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-panel" /></div>;
  }
  if (!incident || !detail.data) {
    return (
      <div className="empty-state full-page">
        <span><ShieldAlert size={26} /></span><h2>Incident unavailable</h2>
        <p>{detail.error ?? "This report could not be found."}</p>
        <Link className="secondary-button" href="/dashboard/incidents">Back to incidents</Link>
      </div>
    );
  }

  const nextStatuses = NEXT_STATUSES[incident.status].filter((status) => status !== "assigned");
  return (
    <div className="page-stack">
      <div className="detail-back-row">
        <Link href="/dashboard/incidents" className="back-link"><ArrowLeft size={17} /> Incident reports</Link>
        <button className="secondary-button compact-button" onClick={() => void refreshAll()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <header className="incident-hero">
        <div>
          <div className="badge-row"><SeverityBadge severity={incident.severityLevel} /><StatusBadge status={incident.status} /></div>
          <h1>{incident.title}</h1>
          <p>{detail.data.category?.name ?? "Uncategorized"} ? Report #{incident.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="incident-actions">
          {incident.status === "verified" && (
            <button className="primary-button" onClick={() => setModal({ type: "assign" })}><UsersRound size={17} /> Assign responder</button>
          )}
          {nextStatuses.map((status) => (
            <button
              key={status}
              className={status === "rejected" || status === "archived" ? "danger-button" : "secondary-button"}
              onClick={() => { setRemarks(""); setActionError(null); setModal({ type: "status", status }); }}
            >
              {status === "resolved" && <CheckCircle2 size={17} />}
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </header>
      {actionError && <div className="inline-alert error">{actionError}</div>}

      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel detail-section">
            <div className="section-title"><div><h2>Report details</h2><p>Information submitted by the resident</p></div><ClipboardPenLine size={20} /></div>
            <p className="incident-description">{incident.description}</p>
            <div className="detail-facts">
              <div><span><CalendarClock size={16} /> Reported</span><strong>{formatDate(incident.reportedAt)}</strong></div>
              <div><span><MapPin size={16} /> Barangay</span><strong>{detail.data.barangay?.name ?? "Unspecified"}</strong></div>
              <div><span><Navigation size={16} /> Address</span><strong>{incident.approximateAddress ?? "No address supplied"}</strong></div>
              <div><span><Navigation size={16} /> GPS accuracy</span><strong>{incident.locationAccuracy ? `?${Math.round(incident.locationAccuracy)} meters` : "Not recorded"}</strong></div>
            </div>
            <IncidentMap incidents={[incident]} compact />
            <a className="text-link coordinate-link" href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=17/${incident.latitude}/${incident.longitude}`} target="_blank" rel="noreferrer">
              {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)} ? Open in map
            </a>
          </section>

          <section className="panel detail-section">
            <div className="section-title"><div><h2>Evidence photos</h2><p>Protected media attached to this report</p></div><Camera size={20} /></div>
            {detail.data.photos.length ? (
              <div className="photo-grid">
                {detail.data.photos.map((photo) => (
                  <a href={photo.downloadUrl} target="_blank" rel="noreferrer" key={photo.id}>
                    {/* A direct image request preserves the Better Auth session cookie. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.downloadUrl} alt={photo.originalFilename ?? "Incident evidence"} />
                    <span>{photo.originalFilename ?? "Incident evidence"}</span>
                  </a>
                ))}
              </div>
            ) : <div className="empty-inline">No photos were attached to this report.</div>}
          </section>

          <section className="panel detail-section">
            <div className="section-title"><div><h2>Status timeline</h2><p>Operational history for this incident</p></div></div>
            <div className="timeline">
              {detail.data.statusLogs.map((log) => (
                <div className="timeline-item" key={log.id}>
                  <span className={`timeline-dot status-${log.toStatus}`} />
                  <div><strong>{titleCase(log.toStatus)}</strong><p>{log.remarks ?? `Status changed from ${titleCase(log.fromStatus ?? "new")}`}</p><small>{formatDate(log.createdAt)} ? {log.changedByName ?? "System"}</small></div>
                </div>
              ))}
              {!detail.data.statusLogs.length && <div className="empty-inline">No status changes recorded yet.</div>}
            </div>
          </section>
        </div>

        <aside className="detail-aside">
          <section className="panel side-card">
            <div className="section-title"><div><h2>Reporter</h2></div><UserRound size={19} /></div>
            <strong className="person-name">{detail.data.reporter?.name ?? "Unknown resident"}</strong>
            <p>{detail.data.reporter?.address ?? incident.approximateAddress ?? "No address available"}</p>
            {detail.data.reporter?.mobileNumber && <a href={`tel:${detail.data.reporter.mobileNumber}`} className="contact-link"><Phone size={16} /> {detail.data.reporter.mobileNumber}</a>}
          </section>

          <section className="panel side-card">
            <div className="section-title"><div><h2>Response assignment</h2></div><UsersRound size={19} /></div>
            {detail.data.assignedResponder ? (
              <div className="responder-summary">
                <strong>{detail.data.assignedResponder.name}</strong>
                <span>{detail.data.assignedResponder.teamName ?? "Responder"}</span>
                <dl><dt>Specialization</dt><dd>{detail.data.assignedResponder.specialization ?? "General response"}</dd><dt>Vehicle</dt><dd>{detail.data.assignedResponder.vehicle ?? "Not specified"}</dd></dl>
                {!["resolved", "archived", "rejected"].includes(incident.status) && <button className="secondary-button full-button" onClick={() => setModal({ type: "assign" })}>Reassign team</button>}
              </div>
            ) : <><p className="muted">No responder is assigned.</p>{incident.status === "verified" && <button className="primary-button full-button" onClick={() => setModal({ type: "assign" })}>Assign responder</button>}</>}
          </section>

          <form className="panel side-card edit-form" onSubmit={saveIncident}>
            <div className="section-title"><div><h2>Edit incident</h2><p>Operational corrections</p></div><ClipboardPenLine size={19} /></div>
            <label>Title<input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} required minLength={3} /></label>
            <label>Description<textarea value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} required minLength={3} rows={4} /></label>
            <label>Severity<select value={edit.severityLevel} onChange={(event) => setEdit({ ...edit, severityLevel: event.target.value })}>{(reference.data?.severityLevels ?? []).map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}</select></label>
            <label>Barangay<select value={edit.barangayId} onChange={(event) => setEdit({ ...edit, barangayId: event.target.value })}><option value="">Unspecified</option>{(reference.data?.barangays ?? []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Responder remarks<textarea value={edit.responderRemarks} onChange={(event) => setEdit({ ...edit, responderRemarks: event.target.value })} rows={3} /></label>
            <button className="secondary-button full-button" disabled={working}>{working && <LoaderCircle className="spin" size={16} />} Save changes</button>
          </form>
        </aside>
      </div>

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => !working && setModal(null)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setModal(null)} disabled={working}><X size={20} /></button>
            {modal.type === "status" ? (
              <form onSubmit={updateStatus}>
                <span className="modal-icon"><ShieldAlert size={23} /></span>
                <h2>Move incident to {STATUS_LABELS[modal.status]}?</h2>
                <p>This change is recorded in the incident timeline and the reporter will be notified.</p>
                <label>{modal.status === "rejected" ? "Rejection reason" : "Operational remarks"}<textarea rows={4} value={remarks} onChange={(event) => setRemarks(event.target.value)} required={modal.status === "rejected"} placeholder={modal.status === "rejected" ? "Explain why this report is being rejected?" : "Optional notes for this status change?"} /></label>
                {actionError && <div className="form-error">{actionError}</div>}
                <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className={modal.status === "rejected" ? "danger-button" : "primary-button"} disabled={working}>{working && <LoaderCircle className="spin" size={16} />} Confirm status</button></div>
              </form>
            ) : (
              <form onSubmit={assignResponder}>
                <span className="modal-icon"><UsersRound size={23} /></span>
                <h2>Assign response team</h2>
                <p>Available responders are shown first. Assignment sends a notification to the responder.</p>
                <label>Responder<select required value={assignment.responderId} onChange={(event) => { const responder = availableResponders.find((item) => item.id === event.target.value); setAssignment({ ...assignment, responderId: event.target.value, assignedVehicle: responder?.vehicle ?? "" }); }}><option value="">Select an available responder</option>{availableResponders.map((item) => <option value={item.id} key={item.id}>{item.name}{item.teamName ? ` ? ${item.teamName}` : ""}</option>)}</select></label>
                <div className="form-grid"><label>Vehicle<input value={assignment.assignedVehicle} onChange={(event) => setAssignment({ ...assignment, assignedVehicle: event.target.value })} placeholder="Ambulance 1" /></label><label>ETA (minutes)<input type="number" min={0} max={1440} value={assignment.etaMinutes} onChange={(event) => setAssignment({ ...assignment, etaMinutes: event.target.value })} /></label></div>
                <label>Instructions<textarea rows={3} value={assignment.notes} onChange={(event) => setAssignment({ ...assignment, notes: event.target.value })} placeholder="Dispatch notes and route guidance?" /></label>
                {actionError && <div className="form-error">{actionError}</div>}
                <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" disabled={working || !assignment.responderId}>{working && <LoaderCircle className="spin" size={16} />} Assign responder</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
