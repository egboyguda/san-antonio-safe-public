"use client";

import dynamic from "next/dynamic";
import type { HeatmapData, MapIncident } from "@/lib/dashboard/types";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="skeleton-map" /></div>,
});

export function IncidentMap({
  incidents = [],
  heatPoints = [],
  compact = false,
}: {
  incidents?: MapIncident[];
  heatPoints?: HeatmapData["points"];
  compact?: boolean;
}) {
  return (
    <div className={`map-frame ${compact ? "compact" : ""}`}>
      <MapCanvas incidents={incidents} heatPoints={heatPoints} compact={compact} />
    </div>
  );
}
