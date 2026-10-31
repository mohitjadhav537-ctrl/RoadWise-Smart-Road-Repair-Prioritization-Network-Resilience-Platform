import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { segmentsApi } from '../lib/api';
import type { RoadSegment } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const RoadInventoryPage: React.FC = () => {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await segmentsApi.list({
        search,
        condition: conditionFilter || undefined,
        skip: page * pageSize,
        limit: pageSize,
      });
      setSegments(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load segments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [page, conditionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchSegments();
  };

  const handleExportCsv = async () => {
    try {
      const blob = await segmentsApi.exportCsv();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'roadwise_segments_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleImportCsv = async () => {
    if (!importCsvText.trim()) return;
    try {
      const res = await segmentsApi.importCsv(importCsvText);
      setImportResult(res);
      fetchSegments();
    } catch (err) {
      console.error('Failed to import CSV:', err);
    }
  };

  const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const getConditionBadge = (cond: string) => {
    switch (cond?.toLowerCase()) {
      case 'good': return <Badge variant="success">Good</Badge>;
      case 'fair': return <Badge variant="warning">Fair</Badge>;
      case 'poor': return <Badge variant="danger">Poor</Badge>;
      case 'critical': return <Badge variant="danger" className="animate-pulse">Critical</Badge>;
      default: return <Badge variant="neutral">{cond || 'Unknown'}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Road Asset Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalog of {total} municipal road segments with geo-coordinates, engineering attributes, and damage ratings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Export All CSV
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or Road Name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Condition:
          </span>
          <select
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value);
              setPage(0);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Conditions</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Segments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Segment ID</th>
                <th className="py-3 px-4">Road Name</th>
                <th className="py-3 px-4">Intersections</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Surface Type</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Repair Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading segments from C++ store...
                    </div>
                  </td>
                </tr>
              ) : segments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No segments found matching the criteria.
                  </td>
                </tr>
              ) : (
                segments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {s.from_node_id || s.from_node} → {s.to_node_id || s.to_node}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.length_m} m</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{s.surface_type}</td>
                    <td className="py-3 px-4">{getConditionBadge(s.condition)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        s.severity >= 8 ? 'bg-red-100 text-red-700' :
                        s.severity >= 6 ? 'bg-orange-100 text-orange-700' :
                        s.severity >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.severity} / 10
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{formatINR(s.repair_cost)}</td>
                    <td className="py-3 px-4">
                      {s.is_closed ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">CLOSED</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium">OPEN</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedSegment(s)}
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

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-700">{page * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-700">{Math.min((page + 1) * pageSize, total)}</strong> of{' '}
            <strong className="text-slate-700">{total}</strong> segments
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-7 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Previous
            </Button>
            <span className="px-2 font-medium text-slate-700">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Segment Detail Modal */}
      {selectedSegment && (
        <Modal
          open={!!selectedSegment}
          onClose={() => setSelectedSegment(null)}
          title={`Road Segment Details: ${selectedSegment.id}`}
          description={selectedSegment.name}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">From Node</span>
                <strong className="text-slate-800 font-mono">{selectedSegment.from_node_id || selectedSegment.from_node}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">To Node</span>
                <strong className="text-slate-800 font-mono">{selectedSegment.to_node_id || selectedSegment.to_node}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Length</span>
                <strong className="text-slate-800">{selectedSegment.length_m} meters</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Surface Type</span>
                <strong className="text-slate-800 capitalize">{selectedSegment.surface_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pavement Condition</span>
                <strong className="text-slate-800 capitalize">{selectedSegment.condition}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Damage Severity</span>
                <strong className={selectedSegment.severity >= 8 ? 'text-red-600 font-bold' : 'text-slate-800'}>
                  {selectedSegment.severity} / 10
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Estimated Repair Cost</span>
                <strong className="text-slate-800">{formatINR(selectedSegment.repair_cost)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Repair Duration</span>
                <strong className="text-slate-800">{selectedSegment.repair_duration_days} days</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Network State</span>
                <strong className={selectedSegment.is_closed ? 'text-red-600' : 'text-emerald-600'}>
                  {selectedSegment.is_closed ? 'Closed to Traffic' : 'Operational'}
                </strong>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-1">Topological & Traffic Significance</h4>
              <p className="text-slate-600">
                Traffic Importance Score: <strong>{selectedSegment.traffic_importance}</strong> • Connectivity Importance Score: <strong>{selectedSegment.connectivity_importance}</strong>
              </p>
              <p className="text-slate-500 text-[11px] mt-1">
                Data certified for Pune Municipal Corporation (PMC) Road Network DSA prioritization model.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedSegment(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportResult(null);
        }}
        title="Import Road Segments CSV"
        description="Paste raw CSV content or standard road segment definitions into the C++ domain store."
        size="lg"
      >
        <div className="space-y-4">
          <textarea
            value={importCsvText}
            onChange={(e) => setImportCsvText(e.target.value)}
            rows={8}
            placeholder="segment_id,name,from_intersection_id,to_intersection_id,length_m,surface_type,condition,severity,traffic_importance,connectivity_importance,repair_cost,repair_duration_days"
            className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-200 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {importResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                Import complete: <strong>{importResult.created}</strong> created, <strong>{importResult.updated}</strong> updated.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImportCsv}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Parse & Save to C++ Store
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
