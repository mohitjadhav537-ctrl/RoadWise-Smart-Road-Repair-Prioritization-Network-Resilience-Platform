import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, AlertCircle, HardHat, FileSpreadsheet, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Role, User } from '../types';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ username, password });
      const userObj: User = {
        id: res.user_id || 'USR_1',
        username: res.username || username,
        email: `${username}@roadwise.gov.in`,
        role: (res.role as Role) || 'admin',
        is_active: true,
      };
      login(userObj, res.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: string, role: Role) => {
    setUsername(user);
    setPassword('password123');
    setError(null);
  };

  const demoRoles: { username: string; label: string; role: Role; icon: string; desc: string }[] = [
    { username: 'admin', label: 'System Admin', role: 'admin', icon: '⚡', desc: 'Full configuration & system management' },
    { username: 'inspector1', label: 'Field Inspector', role: 'inspector', icon: '🔍', desc: 'Log Potholes & GPS damage reports' },
    { username: 'engineer1', label: 'Road Engineer', role: 'engineer', icon: '📐', desc: 'Defect verification & treatment specs' },
    { username: 'planner1', label: 'Maintenance Planner', role: 'planner', icon: '📊', desc: 'DP Knapsack budget & priority solver' },
    { username: 'approver1', label: 'Approving Officer', role: 'approver', icon: '🏛️', desc: 'Work order sign-off & sanction' },
    { username: 'auditor1', label: 'Public Auditor', role: 'auditor', icon: '📜', desc: 'Read-only audit trails & reports' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/25 mb-3">
            RW
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            RoadWise
            <span className="text-xs bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
              C++20 Native
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Smart Road Repair Prioritization & Network Resilience Platform
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition shadow-md shadow-blue-600/30"
          >
            Sign In to Console
          </Button>
        </form>

        {/* Demo Fast Login Personas */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Persona Login (Demo Roles)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoRoles.map((r) => (
              <button
                key={r.username}
                type="button"
                onClick={() => handleQuickLogin(r.username, r.role)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                  username === r.username
                    ? 'bg-blue-600/20 border-blue-500/60 text-white'
                    : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">{r.icon}</span>
                <div className="truncate">
                  <div className="text-xs font-semibold truncate leading-tight">{r.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{r.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          Pune Municipal Corporation (PMC) Network • High Performance C++ Server
        </div>
      </div>
    </div>
  );
};
