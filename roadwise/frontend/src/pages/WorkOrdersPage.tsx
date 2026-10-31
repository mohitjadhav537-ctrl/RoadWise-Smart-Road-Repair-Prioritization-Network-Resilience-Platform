import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileCheck,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { workOrdersApi, segmentsApi } from '../lib/api';
import type { WorkOrder, RoadSegment } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const WorkOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  // New WO form
  const [segmentId, setSegmentId] = useState('SEG1');
  const [treatment, setTreatment] = useState('Bituminous Pothole Patching & Resurfacing');
  const [cost, setCost] = useState(450000);
  const [crew, setCrew] = useState('PWD Rapid Patching Unit 1');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-08');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [woRes, segRes] = await Promise.all([
        workOrdersApi.list(),
        segmentsApi.list({ limit: 100 }),
      ]);
      setOrders(woRes.items);
      setSegments(segRes.items);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await workOrdersApi.create({
        segment_id: segmentId,
        treatment_description: treatment,
        estimated_cost: cost,
        assigned_crew: crew,
        planned_start: startDate,
        planned_end: endDate,
      });
      setCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.error('Failed to create work order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const getApprovalBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending Sanction</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">PWD Work Orders & Contractor Sanctions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Formal engineering repair contracts, crew assignments, expenditure audits, and approving officer sign-offs.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          Draft Proposed Work Order
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Work Order ID</th>
                <th className="py-3 px-4">Road Segment</th>
                <th className="py-3 px-4">Treatment Specification</th>
                <th className="py-3 px-4">Estimated Sanction</th>
                <th className="py-3 px-4">Assigned Crew</th>
                <th className="py-3 px-4">Sanction Status</th>
                <th className="py-3 px-4">Execution Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading work orders from C++ store...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                orders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{wo.id}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{wo.segment_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{wo.treatment_description}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{formatINR(wo.estimated_cost)}</td>
                    <td className="py-3 px-4 text-slate-600">{wo.assigned_crew}</td>
                    <td className="py-3 px-4">{getApprovalBadge(wo.approval_status)}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-slate-700">{wo.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(wo)}
                        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Work Order Modal */}
      {selectedOrder && (
        <Modal
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Work Order Review: ${selectedOrder.id}`}
          description={`Segment: ${selectedOrder.segment_id} • Assigned: ${selectedOrder.assigned_crew}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Treatment Plan:</span>
                <strong className="text-slate-800">{selectedOrder.treatment_description}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Budget Sanction:</span>
                <strong className="text-slate-800">{formatINR(selectedOrder.estimated_cost)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Execution Window:</span>
                <span className="text-slate-700">{selectedOrder.planned_start} to {selectedOrder.planned_end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sanction State:</span>
                <div>{getApprovalBadge(selectedOrder.approval_status)}</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 text-[11px]">
              <ShieldCheck className="w-4 h-4 inline-block mr-1 text-blue-600" />
              Logged in audit trail. Changes are tamper-evident and accessible to government auditors.
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Work Order Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Propose Official PWD Work Order"
        description="Draft a new road repair authorization under the municipal capital works budget."
        size="md"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Target Road Segment</label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name} (Estimated: {formatINR(s.repair_cost)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Treatment Description</label>
            <input
              type="text"
              required
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Estimated Cost (INR)</label>
              <input
                type="number"
                step="50000"
                required
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Assigned Repair Crew</label>
              <input
                type="text"
                required
                value={crew}
                onChange={(e) => setCrew(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Planned Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Planned End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={submitting} className="bg-blue-600 hover:bg-blue-500 text-white">
              Submit for Approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
