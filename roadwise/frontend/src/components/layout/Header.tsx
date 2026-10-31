import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Cpu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard': return 'Executive Infrastructure Dashboard';
      case '/segments': return 'Road Asset Inventory & Geo-Attributes';
      case '/map': return 'Interactive Road Network & Geospatial Explorer';
      case '/damage-reports': return 'Damage Reports & Defect Assessment';
      case '/priorities': return 'Multi-Factor Explainable Repair Prioritization';
      case '/budget': return '0/1 Knapsack & Greedy Budget Optimization';
      case '/closure': return 'Road Disruption & Network Resilience Simulator';
      case '/scheduling': return 'Maintenance Timeline & Resource Scheduling';
      case '/work-orders': return 'PWD Work Orders & Contractor Approvals';
      case '/reports': return 'Official Audit & Maintenance Report Exports';
      case '/users': return 'Role-Based Access Control & User Directory';
      case '/audit': return 'Tamper-Evident System Audit Trail';
      case '/settings': return 'System Configurations & Weights Engine';
      default: return 'RoadWise Platform';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold text-slate-800">
          {getPageTitle(location.pathname)}
        </h2>
        <span className="hidden lg:inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 font-medium">
          Pune Municipal Corporation (PMC)
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
          <Cpu className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>C++20 Engine Active</span>
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <span className="text-xs text-slate-500 font-medium hidden md:inline">
            Role: <strong className="text-slate-800 capitalize">{user?.role || 'Guest'}</strong>
          </span>
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-300 text-xs font-bold">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : 'GO'}
          </div>
        </div>
      </div>
    </header>
  );
};
