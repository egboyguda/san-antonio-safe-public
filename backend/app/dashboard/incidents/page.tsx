import { Suspense } from "react";
import { IncidentsClient } from "@/components/incidents-client";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="skeleton skeleton-panel" />}>
      <IncidentsClient />
    </Suspense>
  );
}
