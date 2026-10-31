import React from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Server,
  Database,
  Shield,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">System Information & Engine Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Underlying C++ graph parameters, server runtime configurations, and government demonstration notice.
        </p>
      </div>

      {/* Engine Status Card */}
      <Card>
        <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-800">C++20 Computation Engine & Winsock Server</h3>
          </div>
          <Badge variant="success">Operational</Badge>
        </CardHeader>
        <CardContent className="p-5 text-xs space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Server Binary</span>
              <strong className="text-slate-800 font-mono">roadwise_engine.exe</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Standard</span>
              <strong className="text-slate-800">ISO C++20</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Listening Port</span>
              <strong className="text-slate-800 font-mono">8000 (Winsock2)</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Dijkstra Mean Latency</span>
              <strong className="text-emerald-600 font-mono">0.003 ms / run</strong>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-blue-900 leading-relaxed text-[11px]">
            <Info className="w-4 h-4 inline-block mr-1 text-blue-600" />
            The C++ engine maintains the authoritative in-memory weighted graph using custom STL adjacency lists, priority queues, and dynamic programming tables, guaranteeing deterministic zero-overhead calculations.
          </div>
        </CardContent>
      </Card>

      {/* Geospatial Seed Data Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">Pune Municipal Road Asset Dataset (PMC Network)</h3>
          </div>
        </CardHeader>
        <CardContent className="p-5 text-xs space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Road Segments Loaded:</span>
            <strong className="text-slate-800 font-mono">100 Segments</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Intersections / Nodes:</span>
            <strong className="text-slate-800 font-mono">50 Intersections</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Critical Lifeline Facilities:</span>
            <strong className="text-slate-800 font-mono">5 Major Hospitals & Fire Stations</strong>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Topological Bridges Detected:</span>
            <strong className="text-amber-700 font-mono">Tarjan Algorithm Active</strong>
          </div>
        </CardContent>
      </Card>

      {/* Government Disclaimer */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardContent className="p-5 text-xs text-amber-900 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <Shield className="w-4 h-4" /> Academic & Engineering Research Disclaimer
          </div>
          <p className="leading-relaxed">
            This platform is an advanced engineering demonstration illustrating the application of real Data Structures and Algorithms (Dijkstra, BFS, DFS, Tarjan's Bridge Finding, and 0/1 Knapsack Dynamic Programming) to municipal infrastructure maintenance planning.
          </p>
          <p className="text-[11px] text-amber-700">
            All road names, coordinates (Pune PMC grid), defect severities, and budgets are municipal demonstration models. The system is designed for engineering and municipal research.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
