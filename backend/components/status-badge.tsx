import type { IncidentStatus, Severity } from "@/lib/dashboard/types";
import {
  severityTone,
  statusTone,
  STATUS_LABELS,
  titleCase,
} from "@/lib/dashboard/format";

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`badge ${statusTone(status)}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge ${severityTone(severity)}`}>
      {titleCase(severity)}
    </span>
  );
}
