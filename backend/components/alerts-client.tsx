"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  LoaderCircle,
  Megaphone,
  RefreshCw,
  Send,
  UsersRound,
  X,
} from "lucide-react";
import { SeverityBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/dashboard/api";
import { formatDate, titleCase } from "@/lib/dashboard/format";
import type { Alert, ReferenceData, Severity } from "@/lib/dashboard/types";
import { usePollingQuery } from "@/lib/dashboard/use-polling";

const initialForm = {
  title: "",
  message: "",
  alertType: "general",
  severityLevel: "moderate",
  targetType: "all",
  targetBarangayId: "",
  targetRole: "resident",
};

export function AlertsClient() {
  const searchParams = useSearchParams();
  const alerts = usePollingQuery<{ alerts: Alert[] }>("/api/alerts");
  const reference = usePollingQuery<ReferenceData>("/api/reference", 0);
  const [composerOpen, setComposerOpen] = useState(searchParams.get("compose") === "true");
  const [confirming, setConfirming] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  function review(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (form.targetType === "barangay" && !form.targetBarangayId) {
      setError("Choose a barangay for this targeted alert.");
      return;
    }
    setConfirming(true);
  }

  async function sendAlert() {
    setWorking(true);
    setError(null);
    try {
      const result = await apiFetch<{ recipients: number }>("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          alertType: form.alertType,
          severityLevel: form.severityLevel,
          targetType: form.targetType,
          targetBarangayId: form.targetType === "barangay" ? form.targetBarangayId : null,
          targetRole: form.targetType === "group" ? form.targetRole : undefined,
        }),
      });
      setSentCount(result.recipients);
      setConfirming(false);
      setComposerOpen(false);
      setForm(initialForm);
      await alerts.refresh(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setWorking(false);
    }
  }

  const targetLabel =
    form.targetType === "all"
      ? "all active users"
      : form.targetType === "barangay"
        ? reference.data?.barangays.find((item) => item.id === form.targetBarangayId)?.name ?? "selected barangay"
        : `users with the ${titleCase(form.targetRole)} role`;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow"><BellRing size={15} /> Public warning system</span>
          <h1>Emergency alerts</h1>
          <p>Broadcast timely, targeted safety information to residents and responders.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => void alerts.refresh(true)} disabled={alerts.refreshing}>
            {alerts.refreshing ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Refresh
          </button>
          <button className="primary-button" onClick={() => { setSentCount(null); setComposerOpen(true); }}><Megaphone size={17} /> Compose alert</button>
        </div>
      </header>
      {sentCount !== null && <div className="inline-alert success"><CheckCircle2 size={18} /> Alert sent successfully to {sentCount.toLocaleString()} recipients.</div>}
      {alerts.error && <div className="inline-alert error">{alerts.error}</div>}

      <section className="panel">
        <div className="panel-heading"><div><h2>Broadcast history</h2><p>Alerts sent by authorized operations staff</p></div><span className="count-pill">{alerts.data?.alerts.length ?? 0} alerts</span></div>
        <div className="alert-list">
          {(alerts.data?.alerts ?? []).map((alert) => (
            <article className="alert-row" key={alert.id}>
              <span className={`alert-type-icon severity-${alert.severityLevel}`}><BellRing size={19} /></span>
              <div className="alert-copy">
                <div><h3>{alert.title}</h3><SeverityBadge severity={alert.severityLevel} /></div>
                <p>{alert.message}</p>
                <footer>
                  <span>{titleCase(alert.alertType)}</span>
                  <span>{alert.targetType === "all" ? "All users" : alert.targetType === "barangay" ? reference.data?.barangays.find((item) => item.id === alert.targetBarangayId)?.name ?? "Barangay" : titleCase(alert.targetRole ?? "Group")}</span>
                  <span><UsersRound size={14} /> {alert.recipientCount.toLocaleString()} recipients</span>
                  <time>{formatDate(alert.sentAt)}</time>
                </footer>
              </div>
            </article>
          ))}
          {!alerts.loading && !alerts.data?.alerts.length && <div className="empty-state"><span><BellRing size={24} /></span><h3>No alerts sent yet</h3><p>Compose the first public safety alert when it is needed.</p></div>}
        </div>
      </section>

      {composerOpen && (
        <div className="modal-backdrop composer-backdrop" onMouseDown={() => !working && setComposerOpen(false)}>
          <div className="modal-card composer-card" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setComposerOpen(false)}><X size={20} /></button>
            <form onSubmit={review}>
              <span className="modal-icon"><Megaphone size={23} /></span>
              <h2>Compose emergency alert</h2>
              <p>Create a concise instruction residents can understand immediately.</p>
              <div className="form-grid">
                <label>Alert type<select value={form.alertType} onChange={(event) => setForm({ ...form, alertType: event.target.value })}><option value="general">General safety</option><option value="weather">Weather warning</option><option value="flood">Flood warning</option><option value="fire">Fire alert</option><option value="evacuation">Evacuation notice</option><option value="medical">Medical advisory</option><option value="road">Road closure</option></select></label>
                <label>Severity<select value={form.severityLevel} onChange={(event) => setForm({ ...form, severityLevel: event.target.value })}>{(reference.data?.severityLevels ?? []).map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}</select></label>
              </div>
              <label>Alert title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} maxLength={160} required placeholder="Flood warning for low-lying areas" /></label>
              <label>Message<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} minLength={3} maxLength={5000} rows={5} required placeholder="State the hazard, affected location, and action residents should take?" /></label>
              <label>Audience<select value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value })}><option value="all">All active users</option><option value="barangay">Specific barangay</option><option value="group">Specific user group</option></select></label>
              {form.targetType === "barangay" && <label>Target barangay<select required value={form.targetBarangayId} onChange={(event) => setForm({ ...form, targetBarangayId: event.target.value })}><option value="">Choose a barangay</option>{(reference.data?.barangays ?? []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}
              {form.targetType === "group" && <label>Target role<select value={form.targetRole} onChange={(event) => setForm({ ...form, targetRole: event.target.value })}><option value="resident">Residents</option><option value="responder">Responders</option><option value="barangay_officer">Barangay officers</option><option value="command_center_staff">Command-center staff</option></select></label>}
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setComposerOpen(false)}>Cancel</button><button className="primary-button"><Send size={16} /> Review alert</button></div>
            </form>
          </div>
        </div>
      )}

      {confirming && (
        <div className="modal-backdrop top-modal">
          <div className="modal-card confirm-card">
            <span className="modal-icon warning"><BellRing size={23} /></span>
            <h2>Send this alert now?</h2>
            <p>The message will be delivered to <strong>{targetLabel}</strong> and cannot be recalled.</p>
            <div className="alert-preview"><SeverityBadge severity={form.severityLevel as Severity} /><strong>{form.title}</strong><p>{form.message}</p></div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions"><button className="secondary-button" onClick={() => setConfirming(false)} disabled={working}>Go back</button><button className="primary-button" onClick={sendAlert} disabled={working}>{working ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} Send alert now</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
