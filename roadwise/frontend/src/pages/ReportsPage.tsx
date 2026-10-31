import React, { useState } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Building,
  Coins,
  Layers,
  ArrowUpDown,
  ClipboardList,
} from 'lucide-react';
import { reportsApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (
    type: 'condition' | 'priorities' | 'workOrders' | 'budget',
    filename: string
  ) => {
    setDownloading(type);
    try {
      let blob;
      if (type === 'condition') blob = await reportsApi.downloadRoadCondition();
      else if (type === 'priorities') blob = await reportsApi.downloadPriorityList();
      else if (type === 'workOrders') blob = await reportsApi.downloadWorkOrders();
      else if (type === 'budget') blob = await reportsApi.downloadBudgetScenarios();

      if (blob) {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error(`Failed to download report ${type}:`, err);
    } finally {
      setDownloading(null);
    }
  };

  const reportItems = [
    {
      id: 'condition',
      title: 'Municipal Road Condition & Inventory Audit',
      filename: 'roadwise_condition_report.csv',
      desc: 'Complete inventory of all 100 road segments, surface classification, lengths, structural distress levels, and verified engineering ratings.',
      icon: Layers,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'priorities',
      title: 'Multi-Factor Repair Priority Ranking Ledger',
      filename: 'roadwise_priorities_report.csv',
      desc: 'Transparent factor decomposition (Severity, Traffic, Connectivity, Delay Risk) with safety-critical hazard flags.',
      icon: ArrowUpDown,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      id: 'workOrders',
      title: 'Sanctioned Work Orders & Contractor Expenditure',
      filename: 'roadwise_work_orders_report.csv',
      desc: 'PWD contracts, treatment specifications, assigned crews, planned schedules, and public fund utilization.',
      icon: ClipboardList,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      id: 'budget',
      title: '0/1 Knapsack Budget Optimization Scenarios',
      filename: 'roadwise_budget_scenarios_report.csv',
      desc: 'Comparative analysis of optimal DP selections versus greedy heuristics under municipal budget caps.',
      icon: Coins,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Official Municipal Reports & CSV Exports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export certified audit records, road inventories, and optimization models for municipal corporation review.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Tamper-evident CSV Generation</span>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportItems.map((r) => {
          const Icon = r.icon;
          const isCurrent = downloading === r.id;
          return (
            <Card key={r.id} className="border-slate-200 hover:shadow-md transition">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{r.title}</h3>
                      <span className="font-mono text-[11px] text-slate-400">{r.filename}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">Format: RFC 4180 CSV</span>
                  <Button
                    size="sm"
                    isLoading={isCurrent}
                    onClick={() => handleDownload(r.id as any, r.filename)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                  >
                    Download CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
