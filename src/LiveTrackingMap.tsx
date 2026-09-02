import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Distance between two lat/lng points, in kilometers (haversine formula).
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgoLabel(ms?: number) {
  if (!ms) return null;
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

// Pin-shaped divIcon so we don't need to bundle Leaflet's default marker
// image assets — a colored teardrop with an emoji, rendered as plain HTML/CSS.
function pinIcon(bg: string, emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${bg};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border:2px solid white;">
      <span style="transform:rotate(45deg);font-size:16px;">${emoji}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

type Props = {
  customerName: string;
  workerName: string;
  service: string;
  customerLat?: number;
  customerLng?: number;
  workerLat?: number;
  workerLng?: number;
  workerLocationUpdatedAt?: number;
  onClose: () => void;
};

// Real-time map showing where the customer and the assigned worker
// currently are. Reads its coordinates straight from props, so as long as
// the caller passes in data from a live Firestore listener (see
// `liveBookings` in App.tsx), the two pins glide to their new spots
// automatically whenever either side's location updates — no polling here.
export default function LiveTrackingMap({
  customerName,
  workerName,
  service,
  customerLat,
  customerLng,
  workerLat,
  workerLng,
  workerLocationUpdatedAt,
  onClose,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const workerMarkerRef = useRef<L.Marker | null>(null);
  const [, tick] = useState(0);

  // Keep the "updated Xs ago" label fresh even when no new coordinates
  // have arrived.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Create the map once.
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const startLat = customerLat ?? workerLat ?? 26.7606;
    const startLng = customerLng ?? workerLng ?? 83.3732;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([startLat, startLng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // Leaflet sizes itself off the container at creation time — since this
    // map lives inside a just-opened modal, force a resize check once the
    // layout has settled.
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
      customerMarkerRef.current = null;
      workerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move/create markers whenever either location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: [number, number][] = [];

    if (customerLat != null && customerLng != null) {
      const pos: [number, number] = [customerLat, customerLng];
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker(pos, { icon: pinIcon("#1D4ED8", "🧑") })
          .addTo(map)
          .bindPopup(`🧑 ${customerName} — customer`);
      } else {
        customerMarkerRef.current.setLatLng(pos);
      }
      points.push(pos);
    }

    if (workerLat != null && workerLng != null) {
      const pos: [number, number] = [workerLat, workerLng];
      if (!workerMarkerRef.current) {
        workerMarkerRef.current = L.marker(pos, { icon: pinIcon("#16A34A", "🧑‍🔧") })
          .addTo(map)
          .bindPopup(`🧑‍🔧 ${workerName} — worker`);
      } else {
        workerMarkerRef.current.setLatLng(pos);
      }
      points.push(pos);
    }

    if (points.length === 2) {
      map.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [customerLat, customerLng, workerLat, workerLng, customerName, workerName]);

  const distanceKm =
    customerLat != null && customerLng != null && workerLat != null && workerLng != null
      ? haversineKm(customerLat, customerLng, workerLat, workerLng)
      : null;

  const hasWorkerLocation = workerLat != null && workerLng != null;
  const updatedLabel = timeAgoLabel(workerLocationUpdatedAt);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6EEFB]">
          <div>
            <h3 className="font-semibold text-[#0F1E3D]" style={{ fontFamily: "'Fraunces', serif" }}>
              📍 Live location
            </h3>
            <p className="text-xs text-[#64748B]">
              {service} · {customerName} &amp; {workerName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
          >
            ✕
          </button>
        </div>

        <div ref={mapDivRef} className="w-full h-[360px] sm:h-[420px] bg-[#E6EEFB]" />

        <div className="px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-[#1D4ED8] shrink-0" />
            <span className="text-[#0F1E3D] font-medium">{customerName}</span>
            <span className="text-[#64748B]">— customer location</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-[#16A34A] shrink-0" />
            <span className="text-[#0F1E3D] font-medium">{workerName}</span>
            <span className="text-[#64748B]">
              {hasWorkerLocation ? `— live${updatedLabel ? `, updated ${updatedLabel}` : ""}` : "— waiting for the worker to share their location"}
            </span>
          </div>

          {distanceKm != null && (
            <div className="mt-1 text-sm font-semibold text-[#1D4ED8]">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
            </div>
          )}
          {!hasWorkerLocation && (
            <p className="text-xs text-[#64748B]">
              The worker's location appears here automatically once they open their active job on the Kaamsetu app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
