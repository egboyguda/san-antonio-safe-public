"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { HeatmapData, MapIncident } from "@/lib/dashboard/types";
import { formatDate, titleCase } from "@/lib/dashboard/format";

const CENTER: [number, number] = [12.412, 124.279];
const statusColors: Record<string, string> = {
  pending: "#d79b21",
  verified: "#0f8b8d",
  assigned: "#3976d3",
  responding: "#e15b35",
  resolved: "#2f9d62",
  archived: "#68758a",
  rejected: "#9c4f62",
};

function BoundsController({
  incidents,
  heatPoints,
}: {
  incidents: MapIncident[];
  heatPoints: HeatmapData["points"];
}) {
  const map = useMap();
  useEffect(() => {
    const coords = [
      ...incidents.map((item) => [item.latitude, item.longitude] as [number, number]),
      ...heatPoints.map((item) => [item.latitude, item.longitude] as [number, number]),
    ];
    if (coords.length === 1) map.setView(coords[0], 15);
    if (coords.length > 1) {
      map.fitBounds(new LatLngBounds(coords), { padding: [32, 32], maxZoom: 15 });
    }
  }, [heatPoints, incidents, map]);
  return null;
}

export default function MapCanvas({
  incidents,
  heatPoints,
  compact,
}: {
  incidents: MapIncident[];
  heatPoints: HeatmapData["points"];
  compact: boolean;
}) {
  const maxHeat = Math.max(1, ...heatPoints.map((point) => point.count));
  return (
    <MapContainer
      center={CENTER}
      zoom={13}
      scrollWheelZoom={!compact}
      zoomControl={!compact}
      className="leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsController incidents={incidents} heatPoints={heatPoints} />
      {heatPoints.map((point, index) => {
        const intensity = point.count / maxHeat;
        return (
          <CircleMarker
            key={`${point.latitude}-${point.longitude}-${index}`}
            center={[point.latitude, point.longitude]}
            radius={10 + intensity * 24}
            pathOptions={{
              color: intensity > 0.6 ? "#c43e38" : "#ef8b31",
              fillColor: intensity > 0.6 ? "#e34d42" : "#f5a742",
              fillOpacity: 0.22 + intensity * 0.38,
              weight: 1,
            }}
          >
            <Popup><strong>{point.count}</strong> incident{point.count === 1 ? "" : "s"} in this area</Popup>
          </CircleMarker>
        );
      })}
      {incidents.map((incident) => (
        <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          radius={incident.severityLevel === "critical" ? 11 : 8}
          pathOptions={{
            color: "#ffffff",
            fillColor: statusColors[incident.status] ?? "#68758a",
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="map-popup">
              <span>{titleCase(incident.severityLevel)} ? {titleCase(incident.status)}</span>
              <strong>{incident.title}</strong>
              <small>{formatDate(incident.reportedAt)}</small>
              <Link href={`/dashboard/incidents/${incident.id}`}>Open incident ?</Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
