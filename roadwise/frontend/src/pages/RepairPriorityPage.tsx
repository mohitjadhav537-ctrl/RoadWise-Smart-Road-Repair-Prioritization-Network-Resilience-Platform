import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  Sliders,
  ShieldAlert,
  Info,
  CheckCircle,
  HelpCircle,
  Calculator,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { prioritiesApi } from '../lib/api';
import type { PriorityScore, WeightsConfig } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export const RepairPriorityPage: React.FC = () => {
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [weights, setWeights] = useState<WeightsConfig>({
    w_severity: 0.40,
    w_traffic: 0.25,
    w_connectivity: 0.20,
    w_delay_risk: 0.15,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, wRes] = await Promise.all([
        prioritiesApi.list(),
        prioritiesApi.getWeights(),
      ]);
      setPriorities(pRes);
      if (wRes) setWeights(wRes);
    } catch (err) {
      console.error('Failed to load priority data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWeightChange = (key: keyof WeightsConfig, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
    setSaveSuccess(false);
  };

  const handleApplyWeights = async () => {
    setUpdating(true);
    try {
      await prioritiesApi.updateWeights(weights);
      const updatedList = await prioritiesApi.calculate();
      setPriorities(updatedList);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to recalculate priorities:', err);
    } finally {
      setUpdating(false);
    }
  };

  const resetDefaultWeights = () => {
    setWeights({
      w_severity: 0.40,
      w_traffic: 0.25,
      w_connectivity: 0.20,
      w_delay_risk: 0.15,
    });
    setSaveSuccess(false);
  };

  const sumWeights = (
    weights.w_severity +
    weights.w_traffic +
    weights.w_connectivity +
    weights.w_delay_risk
  ).toFixed(2);

  const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Explainable Repair Prioritization Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent multi-factor ranking scoring verified damage, network topology, traffic criticality, and deterioration risks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={resetDefaultWeights}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleApplyWeights}
            isLoading={updating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Apply & Recalculate DSA Scores
          </Button>
        </div>
      </div>

      {/* Weights Configuration Box */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/40 via-white to-blue-50/20">
        <CardHeader className="py-3 px-5 border-b border-blue-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-blue-900">Configurable Prioritization Factor Weights</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Total Weight Sum: <strong className="font-mono text-blue-700">{sumWeights}</strong>
            </span>
            {saveSuccess && (
              <Badge variant="success" className="gap-1 text-[11px]">
                <CheckCircle className="w-3 h-3" /> Updated in C++ Engine
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            {/* Severity */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">w_severity (Defect Severity)</span>
                <strong className="text-blue-600 font-mono text-sm">{weights.w_severity.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.w_severity}
                onChange={(e) => handleWeightChange('w_severity', parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">Pothole depth, surface structural cracks, rutting.</p>
            </div>

            {/* Traffic */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">w_traffic (Traffic Volume)</span>
                <strong className="text-blue-600 font-mono text-sm">{weights.w_traffic.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.w_traffic}
                onChange={(e) => handleWeightChange('w_traffic', parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">Peak commuter volume & commercial freight load.</p>
            </div>

            {/* Connectivity */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">w_connectivity (Network Bridge)</span>
                <strong className="text-blue-600 font-mono text-sm">{weights.w_connectivity.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.w_connectivity}
                onChange={(e) => handleWeightChange('w_connectivity', parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">Topological bridge detection & hospital lifeline access.</p>
            </div>

            {/* Delay Risk */}
            <div className="space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-700">w_delay_risk (Deterioration)</span>
                <strong className="text-blue-600 font-mono text-sm">{weights.w_delay_risk.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.w_delay_risk}
                onChange={(e) => handleWeightChange('w_delay_risk', parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">Compounding monsoon erosion & subgrade collapse risk.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Formula: PriorityScore = ({weights.w_severity.toFixed(2)} × Severity) + ({weights.w_traffic.toFixed(2)} × Traffic) + ({weights.w_connectivity.toFixed(2)} × Connectivity) + ({weights.w_delay_risk.toFixed(2)} × DelayRisk)
            </span>
            <span className="text-amber-700 font-medium">
              *Safety-critical defects bypass budget gates and trigger mandatory review
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Priority Rankings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Segment ID</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Traffic Imp.</th>
                <th className="py-3 px-4">Connectivity Imp.</th>
                <th className="py-3 px-4">Delay Risk</th>
                <th className="py-3 px-4">Estimated Cost</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Safety Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Evaluating priority rankings in C++ Priority Queue...
                    </div>
                  </td>
                </tr>
              ) : priorities.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No priorities computed yet.
                  </td>
                </tr>
              ) : (
                priorities.map((item, idx) => (
                  <tr
                    key={item.segment_id}
                    className={`hover:bg-slate-50/80 transition ${
                      item.is_safety_critical ? 'bg-red-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-800 font-bold' :
                        idx === 2 ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                        'text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.segment_id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, (item.priority_score / 10) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-blue-600 text-xs">
                          {item.priority_score.toFixed(3)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.severity >= 8 ? 'bg-red-100 text-red-700' :
                        item.severity >= 6 ? 'bg-orange-100 text-orange-700' :
                        item.severity >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.severity} / 10
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.traffic_importance.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-600">{item.connectivity_importance.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-600">{item.delay_risk.toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{formatINR(item.repair_cost)}</td>
                    <td className="py-3 px-4 text-slate-600">{item.repair_duration_days} days</td>
                    <td className="py-3 px-4">
                      {item.is_safety_critical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <ShieldAlert className="w-3 h-3 text-red-600" /> MANDATORY REVIEW
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Standard</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
