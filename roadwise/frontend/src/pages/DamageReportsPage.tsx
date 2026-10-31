import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Filter,
  FileCheck,
  XCircle,
  Eye,
  Sliders,
} from 'lucide-react';
import { damageReportsApi, segmentsApi } from '../lib/api';
import type { DamageReport, RoadSegment } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const DamageReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);

  // Form state
  const [formSegmentId, setFormSegmentId] = useState('SEG1');
  const [formCategory, setFormCategory] = useState('pothole');
  const [formSeverity, setFormSeverity] = useState(7);
  const [formDesc, setFormDesc] = useState('');
  const [formLat, setFormLat] = useState(28.6502);
  const [formLng, setFormLng] = useState(77.2514);
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [repRes, segRes] = await Promise.all([
        damageReportsApi.list(),
        segmentsApi.list({ limit: 100 }),
      ]);
      setReports(repRes.items);
      setSegments(segRes.items);
    } catch (err) {
      console.error('Failed to load damage reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await damageReportsApi.create({
        segment_id: formSegmentId,
        defect_category: formCategory,
        severity: formSeverity,
        description: formDesc,
        lat: formLat,
        lng: formLng,
      });
      setCreateModalOpen(false);
      setFormDesc('');
      fetchReports();
    } catch (err) {
      console.error('Failed to log damage report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return <Badge variant="success">Verified (Engineer)</Badge>;
      case 'under_review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'reported':
        return <Badge variant="info">Reported (Field)</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredReports = statusFilter
    ? reports.filter((r) => r.verification_status?.toLowerCase() === statusFilter.toLowerCase())
    : reports;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Damage Reports & Defect Assessments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Field inspections, citizen defect logs, and road engineer verification workflow.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          Log Defect Report
        </Button>
      </div>

      {/* Filter row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Verification Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Reports ({reports.length})</option>
            <option value="verified">Verified</option>
            <option value="reported">Reported</option>
            <option value="under_review">Under Review</option>
          </select>
        </div>
        <div className="text-xs text-slate-400">
          Showing <strong>{filteredReports.length}</strong> reports
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Road Segment</th>
                <th className="py-3 px-4">Defect Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Inspection Date</th>
                <th className="py-3 px-4">GPS Location</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading defect records from C++ engine...
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No damage reports match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.id}</td>
                    <td className="py-3 px-4 font-mono font-medium text-blue-600">{r.segment_id}</td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-700">{r.defect_category}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        r.severity >= 8 ? 'bg-red-100 text-red-700' :
                        r.severity >= 6 ? 'bg-orange-100 text-orange-700' :
                        r.severity >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.severity} / 10
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{r.inspection_date || 'Recent'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(r.verification_status)}</td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedReport(r)}
                        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Report Modal */}
      {selectedReport && (
        <Modal
          open={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Inspection Defect: ${selectedReport.id}`}
          description={`Asset: ${selectedReport.segment_id} • Status: ${selectedReport.verification_status}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Defect Type:</span>
                <strong className="text-slate-800 capitalize">{selectedReport.defect_category}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Severity Rating:</span>
                <strong className={selectedReport.severity >= 8 ? 'text-red-600' : 'text-slate-800'}>
                  {selectedReport.severity} / 10
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GPS Coordinates:</span>
                <span className="font-mono text-slate-700">{selectedReport.lat}, {selectedReport.lng}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block mb-1">Field Observation:</span>
                <p className="text-slate-800 bg-white p-2 rounded border border-slate-200">
                  {selectedReport.description || 'No descriptive comments logged by inspector.'}
                </p>
              </div>
              {selectedReport.engineer_comments && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-blue-900 font-semibold block mb-1">Road Engineer Review:</span>
                  <p className="text-blue-800 bg-blue-50 p-2 rounded border border-blue-200">
                    {selectedReport.engineer_comments}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Defect Report Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Log Field Damage Report"
        description="Submit a new road defect for PWD engineering review & priority calculation."
        size="md"
      >
        <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Select Road Segment</label>
            <select
              value={formSegmentId}
              onChange={(e) => setFormSegmentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
            >
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name} ({s.surface_type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Defect Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="pothole">Pothole</option>
                <option value="crack">Crack / Rutting</option>
                <option value="surface_deformation">Surface Deformation</option>
                <option value="drainage_issue">Drainage / Waterlogging</option>
                <option value="erosion">Erosion</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Severity Rating: <strong className="text-blue-600">{formSeverity} / 10</strong>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formSeverity}
                onChange={(e) => setFormSeverity(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Field Description</label>
            <textarea
              required
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Describe pothole depth, crack spread, traffic hazard, etc."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formLat}
                onChange={(e) => setFormLat(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formLng}
                onChange={(e) => setFormLng(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={submitting} className="bg-blue-600 hover:bg-blue-500 text-white">
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
