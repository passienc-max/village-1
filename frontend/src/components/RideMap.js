import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";

const KLAMATH_FALLS = [42.2249, -121.7817];
const COLORS = { volunteer: "#D96838", parent: "#1E3D2F" };

const FitBounds = ({ points }) => {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
};

export const RideMap = ({ locations, className = "h-72" }) => (
  <div className={`overflow-hidden rounded-xl border border-[#E5E3D8] ${className}`} data-testid="ride-map">
    <MapContainer center={KLAMATH_FALLS} zoom={11} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {locations.map((l) => (
        <CircleMarker key={`${l.role}-${l.name}`} center={[l.lat, l.lng]} radius={10}
          pathOptions={{ color: "#fff", weight: 3, fillColor: COLORS[l.role] || "#588157", fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>{l.name} · {new Date(l.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Tooltip>
        </CircleMarker>
      ))}
      <FitBounds points={locations} />
    </MapContainer>
  </div>
);
