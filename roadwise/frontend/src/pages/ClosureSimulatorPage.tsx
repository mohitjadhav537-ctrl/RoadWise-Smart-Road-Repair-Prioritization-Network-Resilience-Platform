import React, { useState, useEffect } from 'react';
import {
  Route,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Network,
  GitBranch,
  RotateCcw,
  Building,
  ArrowRight,
} from 'lucide-react';
import { closureApi, segmentsApi, intersectionsApi } from '../lib/api';
import type { RoadSegment, Intersection, ClosureSimResult } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const ClosureSimulatorPage: React.FC = () => {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [selectedClosures, setSelectedClosures] = useState<string[]>(['SEG5', 'SEG12']);
  const [fromNode, setFromNode] = useState('N1');
  const [toNode, setToNode] = useState('N10');
  const [simResult, setSimResult] = useState<ClosureSimResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadNetwork() {
      try {
        const [segRes, intRes] = await Promise.all([
          segmentsApi.list({ limit: 100 }),
          intersectionsApi.list(),
        ]);
        setSegments(segRes.items);
        setIntersections(intRes);
      } catch (err) {
        console.error('Failed to load network for closure sim:', err);
      }
    }
    loadNetwork();
  }, []);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await closureApi.simulate({
        closed_segments: selectedClosures,
        from_node: fromNode,
        to_node: toNode,
      });
      setSimResult(res);
    } catch (err) {
      console.error('Failed to run closure simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleClosure = (id: string) => {
    setSelectedClosures((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearClosures = () => {
    setSelectedClosures([]);
    setSimResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Road Disruption & Network Resilience Simulator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulate emergency road closures, flood inundations, or repair roadblocks using C++ BFS reachability, DFS components, and Tarjan bridge finding.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={clearClosures}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Clear Closures
          </Button>
          <Button
            size="sm"
            onClick={handleSimulate}
            isLoading={loading}
            leftIcon={<Route className="w-3.5 h-3.5" />}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Run Resilience Analysis
          </Button>
        </div>
      </div>

      {/* Config Box */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">Simulation Network Parameters</h3>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          {/* Key node selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Origin Intersection</label>
              <select
                value={fromNode}
                onChange={(e) => setFromNode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
              >
                {intersections.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id} — {n.name} {n.is_critical ? `(${n.critical_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Destination Intersection</label>
              <select
                value={toNode}
                onChange={(e) => setToNode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
              >
                {intersections.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id} — {n.name} {n.is_critical ? `(${n.critical_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Road closure picker chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-700 font-medium">
                Simulated Closed Road Edges: <strong className="text-red-600">({selectedClosures.length} selected)</strong>
              </label>
              <span className="text-[11px] text-slate-400">Click to toggle road block</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {segments.map((s) => {
                const isClosed = selectedClosures.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleClosure(s.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition border ${
                      isClosed
                        ? 'bg-red-600 text-white border-red-700 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isClosed ? '🚫 ' : ''}{s.id}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results View */}
      {simResult && (
        <div className="space-y-5">
          {/* Status banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`border-2 ${simResult.is_reroutable ? 'border-emerald-300 bg-emerald-50/40' : 'border-red-300 bg-red-50/40'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Route Feasibility</div>
                  <div className={`text-lg font-bold mt-1 ${simResult.is_reroutable ? 'text-emerald-700' : 'text-red-700'}`}>
                    {simResult.is_reroutable ? 'Alternative Route Found' : 'Destination Unreachable'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    {fromNode} ➔ {toNode}
                  </div>
                </div>
                {simResult.is_reroutable ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 ${simResult.disconnected_nodes_count > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Disconnected Nodes</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {simResult.disconnected_nodes_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Isolated from main connected component
                  </div>
                </div>
                <GitBranch className="w-8 h-8 text-amber-600" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Critical Infrastructure Access</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {simResult.unreachable_critical_destinations.length === 0 ? 'All Accessible' : `${simResult.unreachable_critical_destinations.length} Cut Off`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hospitals & Emergency Lifelines
                  </div>
                </div>
                <Building className="w-8 h-8 text-blue-600" />
              </CardContent>
            </Card>
          </div>

          {/* Topological Analysis Details */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-sm text-slate-800">C++ Graph Theory & Network Resilience Analysis</h3>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Topological Vulnerability (Tarjan's Bridge Detection)</div>
                <p className="text-slate-600 leading-relaxed">
                  Edges whose removal disconnects the graph are bridges. In municipal road planning, bridge edges represent high-vulnerability corridors requiring redundant bypass routes to prevent catastrophic transit isolation during emergencies or heavy monsoon washouts.
                </p>
                {simResult.disconnected_nodes.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="font-bold text-red-700 block mb-1">
                      Disconnected Intersections Identified ({simResult.disconnected_nodes.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                      {simResult.disconnected_nodes.map((nodeId) => (
                        <span key={nodeId} className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold">
                          {nodeId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
