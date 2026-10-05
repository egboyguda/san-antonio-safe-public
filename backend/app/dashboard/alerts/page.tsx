import { Suspense } from "react";
import { AlertsClient } from "@/components/alerts-client";

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="skeleton skeleton-panel" />}>
      <AlertsClient />
    </Suspense>
  );
}
