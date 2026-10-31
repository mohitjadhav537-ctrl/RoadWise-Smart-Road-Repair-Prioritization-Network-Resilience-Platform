import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Layers,
  Info,
  CheckCircle2,
  RefreshCw,
  Route as RouteIcon,
  Crosshair,
  Building2,
} from 'lucide-react';
import { segmentsApi, closureApi } from '../lib/api';
import type { RoadSegment, Intersection } from '../types';
import { RoadMap, type MapSegment, type MapIntersection } from '../components/map/RoadMap';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const RoadMapPage: React.FC = () => {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);

  // Shortest route finder state
  const [fromNode, setFromNode] = useState('N1');
  const [toNode, setToNode] = useState('N10');
  const [closedIds, setClosedIds] = useState<string[]>([]);
  const [routeNodes, setRouteNodes] = useState<string[]>([]);
  const [routeDist, setRouteDist] = useState<number | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const data = await segmentsApi.getMapData();
      setSegments(data.segments);
      setIntersections(data.intersections);

      // Collect initial closed segments
      const initialClosed = data.segments.filter((s) => s.is_closed).map((s) => s.id);
      setClosedIds(initialClosed);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  const handleCalculateRoute = async () => {
    setCalculatingRoute(true);
    try {
      const res = await closureApi.simulate({
        closed_segments: closedIds,
        from_node: fromNode,
        to_node: toNode,
      });
      // Alternate path returned by C++ Dijkstra
      setRouteNodes(res.alternate_path || []);
    } catch (err) {
      console.error('Failed to compute Dijkstra route:', err);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const toggleSegmentClosure = (segId: string) => {
    setClosedIds((prev) =>
      prev.includes(segId) ? prev.filter((id) => id !== segId) : [...prev, segId]
    );
  };

  const mapSegments: MapSegment[] = segments.map((s) => ({
    id: s.id,
    name: s.name,
    from_node: s.from_node || s.from_node_id || '',
    to_node: s.to_node || s.to_node_id || '',
    length_m: s.length_m,
    severity: s.severity,
    condition: s.condition,
    status: s.is_closed ? 'closed' : 'active',
    is_closed: closedIds.includes(s.id) || s.is_closed,
    repair_cost: s.repair_cost,
    coordinates: s.coordinates || [],
  }));

  const mapIntersections: MapIntersection[] = intersections.map((n) => ({
    id: n.id,
    name: n.name,
    lat: n.lat,
    lng: n.lng,
    is_critical: n.is_critical,
    critical_type: n.critical_type || '',
  }));

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Geospatial Road Network & Route Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive OpenStreetMap layer with live damage overlays, critical hubs, and C++ Dijkstra shortest path calculation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMapData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Network
          </Button>
        </div>
      </div>

      {/* Main split: Map on left, sidebar controls on right */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Map Container */}
        <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-100 min-h-[400px]">
          <RoadMap
            segments={mapSegments}
            intersections={mapIntersections}
            selectedSegmentId={selectedSegment?.id}
            onSelectSegment={(seg) => {
              const fullSeg = segments.find((s) => s.id === seg.id) || null;
              setSelectedSegment(fullSeg);
            }}
            highlightRouteNodes={routeNodes}
            closedSegmentIds={closedIds}
          />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-lg text-[11px] space-y-1.5">
            <div className="font-bold text-slate-700 text-xs mb-1">Road Condition Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Good (Severity 1-3)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>Moderate (Severity 4-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
              <span>Severe (Severity 6-7)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              <span>Critical Hazard (Severity 8-10)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-red-500 border border-dashed border-red-700 inline-block" />
              <span>Closed Road (Excluded from Dijkstra)</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
              <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white inline-block shadow-sm" />
              <span>Critical Facilities (Hospital / Station)</span>
            </div>
          </div>
        </div>

        {/* Sidebar Controls & Inspector Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Dijkstra Route Planner */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <RouteIcon className="w-4 h-4 text-blue-600" />
              <span>C++ Dijkstra Shortest Route</span>
            </div>
            <p className="text-xs text-slate-500">
              Find shortest-distance path between nodes, dynamically routing around closed edges.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Origin Node</label>
                <select
                  value={fromNode}
                  onChange={(e) => setFromNode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {intersections.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} — {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Destination Node</label>
                <select
                  value={toNode}
                  onChange={(e) => setToNode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  {intersections.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} — {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                isLoading={calculatingRoute}
                onClick={handleCalculateRoute}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-1"
              >
                Compute Shortest Route
              </Button>
            </div>

            {routeNodes.length > 0 && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-blue-900">Optimal Path Found:</div>
                <div className="font-mono text-[11px] text-blue-700 break-words">
                  {routeNodes.join(' ➔ ')}
                </div>
              </div>
            )}
          </div>

          {/* Selected Segment Inspector */}
          {selectedSegment ? (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{selectedSegment.name}</span>
                <span className="font-mono text-xs text-slate-500">{selectedSegment.id}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Endpoints:</span>
                  <span className="font-mono text-slate-800">
                    {selectedSegment.from_node_id || selectedSegment.from_node} ➔{' '}
                    {selectedSegment.to_node_id || selectedSegment.to_node}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pavement Severity:</span>
                  <strong className={selectedSegment.severity >= 8 ? 'text-red-600' : 'text-slate-800'}>
                    {selectedSegment.severity} / 10
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Length:</span>
                  <span className="text-slate-800">{selectedSegment.length_m} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Repair Cost:</span>
                  <span className="text-slate-800 font-semibold">₹{selectedSegment.repair_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={closedIds.includes(selectedSegment.id) ? 'text-red-600 font-bold' : 'text-emerald-600 font-medium'}>
                    {closedIds.includes(selectedSegment.id) ? 'Closed' : 'Operational'}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant={closedIds.includes(selectedSegment.id) ? 'primary' : 'danger'}
                onClick={() => toggleSegmentClosure(selectedSegment.id)}
                className="w-full text-xs"
              >
                {closedIds.includes(selectedSegment.id) ? 'Reopen Road Segment' : 'Simulate Closure'}
              </Button>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
              <Crosshair className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              Click any road segment on the map to inspect engineering details or simulate closure.
            </div>
          )}

          {/* Simulated Closures Active */}
          {closedIds.length > 0 && (
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs space-y-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Simulated Road Closures ({closedIds.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {closedIds.map((id) => (
                  <span
                    key={id}
                    onClick={() => toggleSegmentClosure(id)}
                    className="cursor-pointer px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-mono text-[10px] hover:bg-amber-300 transition"
                    title="Click to reopen"
                  >
                    {id} ✕
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
