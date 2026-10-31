import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  CheckCircle2,
  HardHat,
  Search,
  Lock,
} from 'lucide-react';
import { usersApi } from '../lib/api';
import type { User, Role } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const list = await usersApi.list();
        setUsers(list);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const roleDefinitions: { role: Role; label: string; desc: string; perms: string[] }[] = [
    {
      role: 'admin',
      label: 'System Administrator',
      desc: 'Full administrative rights across user accounts, algorithm weights, and system configurations.',
      perms: ['User Management', 'Weights Tuning', 'Audit Access', 'CSV Import/Export'],
    },
    {
      role: 'inspector',
      label: 'Field Inspector',
      desc: 'Mobile defect logging in the field with GPS coordinates, defect categories, and severity ratings.',
      perms: ['Create Damage Reports', 'Upload Defect Logs', 'View Road Inventory'],
    },
    {
      role: 'engineer',
      label: 'Road Engineer',
      desc: 'Professional engineering defect verification, pavement condition assessment, and treatment design.',
      perms: ['Verify Defects', 'Edit Segment Attributes', 'Specify Treatments'],
    },
    {
      role: 'planner',
      label: 'Maintenance Planner',
      desc: 'Optimization modelling, 0/1 knapsack budget allocations, and road closure simulations.',
      perms: ['Run Budget DP', 'Simulate Closures', 'Draft Work Orders'],
    },
    {
      role: 'approver',
      label: 'Approving Officer',
      desc: 'Sanctions work orders, allocates municipal budgets, and provides formal executive sign-offs.',
      perms: ['Approve Work Orders', 'Reject Work Orders', 'Sanction Budgets'],
    },
    {
      role: 'auditor',
      label: 'Public Auditor',
      desc: 'Read-only transparency role for verifying audit trails, reports, and financial compliance.',
      perms: ['View Audit Logs', 'Download Reports', 'Inspect Historical Scenarios'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Role-Based Access Control & User Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Municipal roles and permissions enforced strictly by the C++ backend authentication engine.
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm text-slate-800">Active Municipal Personnel Accounts</h3>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading personnel accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={String(u.id)} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{u.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{u.username}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <div>
        <h3 className="font-bold text-sm text-slate-800 mb-3">Enforced Role Responsibility Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {roleDefinitions.map((rd) => (
            <Card key={rd.role} className="border-slate-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">{rd.label}</h4>
                  <Badge variant="neutral" className="text-[10px] font-mono capitalize">
                    {rd.role}
                  </Badge>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">{rd.desc}</p>
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Permitted Operations:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rd.perms.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                        ✓ {p}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
