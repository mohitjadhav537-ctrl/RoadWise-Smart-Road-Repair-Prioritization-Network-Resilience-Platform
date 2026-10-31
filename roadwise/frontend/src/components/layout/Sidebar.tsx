import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Map as MapIcon,
  AlertTriangle,
  ArrowUpDown,
  Calculator,
  Sliders,
  Calendar,
  ClipboardList,
  FileText,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Route
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/map', label: 'Network Map Explorer', icon: MapIcon },
      ],
    },
    {
      title: 'ROAD ASSETS',
      items: [
        { to: '/segments', label: 'Road Inventory', icon: Layers },
        { to: '/damage-reports', label: 'Damage Reports', icon: AlertTriangle },
      ],
    },
    {
      title: 'DSA OPTIMIZATION',
      items: [
        { to: '/priorities', label: 'Repair Priorities', icon: ArrowUpDown },
        { to: '/budget', label: 'Budget Optimizer', icon: Calculator },
        { to: '/closure', label: 'Closure Simulator', icon: Route },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { to: '/scheduling', label: 'Repair Scheduling', icon: Calendar },
        { to: '/work-orders', label: 'Work Orders', icon: ClipboardList },
        { to: '/reports', label: 'Reports & Analytics', icon: FileText },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { to: '/users', label: 'User Roles', icon: Users, role: 'admin' },
        { to: '/audit', label: 'Audit Trail', icon: ShieldAlert, role: 'auditor' },
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 h-screen text-slate-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
          RW
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5">
            RoadWise
            <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-1.5 py-0.5 rounded border border-blue-500/30">
              C++20
            </span>
          </h1>
          <p className="text-xs text-slate-400">PWD Resilience Platform</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs font-medium">
        {navGroups.map((grp) => (
          <div key={grp.title}>
            <div className="px-2 text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {grp.title}
            </div>
            <div className="space-y-0.5">
              {grp.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile & logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 border border-slate-600">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="truncate">
            <div className="text-xs font-medium text-white truncate">{user?.username || 'Gov User'}</div>
            <div className="text-[10px] text-blue-400 capitalize truncate">{user?.role || 'Guest'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
