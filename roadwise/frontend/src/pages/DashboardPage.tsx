import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Layers,
  Route,
  TrendingUp,
  Wrench,
  ArrowRight,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dashboardApi, prioritiesApi } from '../lib/api';
import type { KPIData, ChartData, PriorityScore } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [topPriorities, setTopPriorities] = useState<PriorityScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiRes, chartRes, priorityRes] = await Promise.all([
          dashboardApi.getKPIs(),
          dashboardApi.getCharts(),
          prioritiesApi.list(),
        ]);
        setKpis(kpiRes);
        setCharts(chartRes);
        setTopPriorities(priorityRes.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatINR = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const SEVERITY_COLORS = [
    '#10b981', '#10b981', '#34d399', '#facc15', '#fbbf24',
    '#f97316', '#fb923c', '#ef4444', '#dc2626', '#b91c1c',
  ];

  const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Fetching real-time C++ engine metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Pune Municipal Corporation (PMC) - PWD Road Network
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> C++ Engine Latency: 0.003ms
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Road Network Health & Optimization Center</h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Real-time graph metrics, Tarjan bridge topological vulnerability, and 0/1 knapsack budget allocations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/budget">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm">
              <Coins className="w-4 h-4" /> Run Budget DP
            </Button>
          </Link>
          <Link to="/closure">
            <Button size="sm" variant="outline" className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-800 gap-1.5">
              <Route className="w-4 h-4" /> Closure Sim
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Total Segments</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{kpis?.total_segments ?? 100}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">50 Critical Intersections</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Verified Defects</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{kpis?.verified_damaged ?? 0}</div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">Assessed by Engineers</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Safety-Critical Roads</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{kpis?.high_priority ?? 0}</div>
              <div className="text-[11px] text-red-700 font-medium mt-0.5">Severity Level 8-10</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Pending Inspections</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{kpis?.pending_inspections ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Field Inspector Queue</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Sanctioned Spend</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{formatINR(kpis?.planned_spend ?? 0)}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Approved Work Orders</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Remaining Budget</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{formatINR(kpis?.remaining_budget ?? 0)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">From ₹10 Cr Demo Fund</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Active Work Orders</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{kpis?.active_work_orders ?? 0}</div>
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">Crews in Field</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Completed Repairs</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{kpis?.completed_repairs ?? 0}</div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">QC Inspected & Closed</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Defect Severity Distribution (Scale 1–10)</h3>
              <Badge variant="warning">Inspected Assets</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.defects_by_severity || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} reports`, 'Count']}
                  labelFormatter={(lbl) => `Severity Level ${lbl}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(charts?.defects_by_severity || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[(entry.severity - 1) % SEVERITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repairs by Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Work Orders Lifecycle Breakdown</h3>
              <Badge variant="info">Workflow Pipeline</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.repairs_by_status || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(charts?.repairs_by_status || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [`${val} orders`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Road Category */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Estimated Repair Cost by Road Classification</h3>
              <Badge variant="neutral">Financials</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.cost_by_category || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatINR(v), 'Repair Cost']} />
                <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Municipal Budget Utilization Structure</h3>
              <Badge variant="success">₹10 Cr Sanctioned</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.budget_breakdown || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(charts?.budget_breakdown || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#64748b'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [formatINR(v), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Priority Roads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Safety-Critical Repair Priority Queue (DSA Evaluated)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Top urgent segments ordered by multi-factor score and safety risk.</p>
          </div>
          <Link to="/priorities" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View All Priority Scores <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4">Segment</th>
                <th className="py-2.5 px-4">Priority Score</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Traffic Imp.</th>
                <th className="py-2.5 px-4">Connectivity Imp.</th>
                <th className="py-2.5 px-4">Estimated Cost</th>
                <th className="py-2.5 px-4">Safety Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topPriorities.map((item, idx) => (
                <tr key={item.segment_id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                    #{idx + 1} {item.segment_id}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-blue-600">
                    {item.priority_score.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.severity >= 8 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.severity} / 10
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">{item.traffic_importance.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-slate-600">{item.connectivity_importance.toFixed(2)}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">{formatINR(item.repair_cost)}</td>
                  <td className="py-2.5 px-4">
                    {item.is_safety_critical ? (
                      <Badge variant="danger" className="text-[10px]">CRITICAL HAZARD</Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px]">Standard</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
