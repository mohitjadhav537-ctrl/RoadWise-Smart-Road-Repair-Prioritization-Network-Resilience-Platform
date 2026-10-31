import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  HardHat,
  Truck,
} from 'lucide-react';
import { workOrdersApi } from '../lib/api';
import type { WorkOrder } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SchedulingPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await workOrdersApi.list();
        setWorkOrders(res.items);
      } catch (err) {
        console.error('Failed to load work orders for scheduling:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const crews = [
    { name: 'PWD Rapid Patching Unit 1', lead: 'Foreman R. Sharma', status: 'In Field (SEG1)', capacity: '85%' },
    { name: 'Asphalt Resurfacing Brigade A', lead: 'Eng. K. Verma', status: 'Mobilizing (SEG8)', capacity: '60%' },
    { name: 'Concrete Structural Repair Team', lead: 'Eng. A. Singh', status: 'Available', capacity: '10%' },
    { name: 'Monsoon Emergency Drainage Crew', lead: 'Foreman P. Lal', status: 'On Standby', capacity: '20%' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Repair Scheduling & Field Resource Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational timeline, contractor deployment windows, and maintenance crew skill balancing.
          </p>
        </div>
      </div>

      {/* Crew Availability Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        {crews.map((c) => (
          <Card key={c.name} className="border-slate-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800 truncate">{c.name}</span>
              </div>
              <div className="text-slate-500 text-[11px]">Lead: {c.lead}</div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-600 font-medium">{c.status}</span>
                <span className="font-mono text-blue-600 font-bold">{c.capacity} Load</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gantt-style Timeline Card */}
      <Card>
        <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">Scheduled Work Execution Schedule (14-Day Lookahead)</h3>
          </div>
          <Badge variant="info">Q3 Maintenance Calendar</Badge>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {workOrders.map((wo, idx) => (
              <div key={wo.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{wo.id}</span>
                    <span className="font-mono text-blue-600">[{wo.segment_id}]</span>
                    <span className="text-slate-600 font-medium">{wo.treatment_description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">{formatINR(wo.estimated_cost)}</span>
                    <Badge variant={wo.status === 'completed' ? 'success' : wo.status === 'in_progress' ? 'warning' : 'info'}>
                      {wo.status}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Planned Start: {wo.planned_start || 'Day 1'}</span>
                    <span>Assigned: {wo.assigned_crew}</span>
                    <span>Completion: {wo.planned_end || 'Day 7'}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        wo.status === 'completed' ? 'bg-emerald-500 w-full' :
                        wo.status === 'in_progress' ? 'bg-amber-500 w-3/5' : 'bg-blue-500 w-1/4'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
