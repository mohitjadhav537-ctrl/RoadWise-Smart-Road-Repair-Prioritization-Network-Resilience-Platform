import React from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapSegment {
  id: string;
  name: string;
  from_node: string;
  to_node: string;
  length_m: number;
  severity: number;
  condition: string;
  status: string;
  is_closed: boolean;
  repair_cost: number;
  coordinates: [number, number][]; // [ [lng, lat], [lng, lat] ]
}

export interface MapIntersection {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_critical: boolean;
  critical_type: string;
}

interface RoadMapProps {
  segments?: MapSegment[];
  intersections?: MapIntersection[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (seg: MapSegment) => void;
  highlightRouteNodes?: string[];
  closedSegmentIds?: string[];
}

export const RoadMap: React.FC<RoadMapProps> = ({
  segments = [],
  intersections = [],
  selectedSegmentId,
  onSelectSegment,
  highlightRouteNodes = [],
  closedSegmentIds = [],
}) => {
  // Center of Pune Municipal Corporation (PMC) road network
  const center: [number, number] = [18.5204, 73.8567];

  const getSegmentColor = (seg: MapSegment) => {
    if (closedSegmentIds.includes(seg.id) || seg.is_closed) return '#ef4444'; // Red
    if (seg.severity >= 8) return '#dc2626'; // High severity
    if (seg.severity >= 6) return '#ea580c'; // Moderate-high
    if (seg.severity >= 4) return '#eab308'; // Moderate
    return '#10b981'; // Good / minor
  };

  return (
    <div className="relative w-full h-full min-h-[450px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Road Segments as Polylines */}
        {segments.map((seg) => {
          if (!seg.coordinates || seg.coordinates.length < 2) return null;
          // Leaflet expects [lat, lng]
          const positions: [number, number][] = seg.coordinates.map((pt) => [pt[1], pt[0]]);
          const isSelected = selectedSegmentId === seg.id;
          const isClosed = closedSegmentIds.includes(seg.id) || seg.is_closed;

          return (
            <Polyline
              key={seg.id}
              positions={positions}
              pathOptions={{
                color: isSelected ? '#3b82f6' : getSegmentColor(seg),
                weight: isSelected ? 6 : isClosed ? 5 : 4,
                dashArray: isClosed ? '6, 6' : undefined,
                opacity: 0.85,
              }}
              eventHandlers={{
                click: () => onSelectSegment && onSelectSegment(seg),
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1">
                  <div className="font-bold text-slate-800 text-sm">{seg.name}</div>
                  <div className="text-slate-500 font-mono">ID: {seg.id}</div>
                  <div className="flex gap-2">
                    <span className="font-semibold">Severity:</span>
                    <span className={seg.severity >= 8 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                      {seg.severity} / 10
                    </span>
                  </div>
                  <div>Length: {seg.length_m}m</div>
                  <div>Cost: ₹{seg.repair_cost.toLocaleString()}</div>
                  <div>Status: <span className="capitalize font-medium">{seg.status}</span></div>
                  {isClosed && <div className="text-red-600 font-bold">⚠️ CLOSED ROAD</div>}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Intersections as CircleMarkers */}
        {intersections.map((node) => {
          const isHighlighted = highlightRouteNodes.includes(node.id);
          const isCritical = node.is_critical;

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lng]}
              radius={isCritical ? 7 : 4}
              pathOptions={{
                fillColor: isHighlighted
                  ? '#3b82f6'
                  : isCritical
                  ? '#9333ea'
                  : '#475569',
                color: '#ffffff',
                weight: 2,
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-800">{node.name}</div>
                  <div className="text-slate-500 font-mono">{node.id}</div>
                  {isCritical && (
                    <div className="text-purple-700 font-semibold uppercase text-[10px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                      ★ Critical Facility: {node.critical_type}
                    </div>
                  )}
                  <div className="text-slate-400 text-[10px]">
                    Lat: {node.lat.toFixed(4)}, Lng: {node.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-md z-[1000] text-xs space-y-1.5">
        <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1">Condition Severity</div>
        <div className="flex items-center gap-2"><span className="w-3.5 h-1 bg-emerald-500 rounded"></span> Minor (1-3)</div>
        <div className="flex items-center gap-2"><span className="w-3.5 h-1 bg-yellow-500 rounded"></span> Moderate (4-6)</div>
        <div className="flex items-center gap-2"><span className="w-3.5 h-1 bg-orange-600 rounded"></span> Poor (7-8)</div>
        <div className="flex items-center gap-2"><span className="w-3.5 h-1 bg-red-600 rounded"></span> Critical (9-10)</div>
        <div className="flex items-center gap-2"><span className="w-3.5 h-1 border-t-2 border-dashed border-red-500"></span> Closed / Rerouted</div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Critical Facility</div>
      </div>
    </div>
  );
};
