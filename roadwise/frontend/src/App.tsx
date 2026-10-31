import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './store/authStore';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoadInventoryPage } from './pages/RoadInventoryPage';
import { RoadMapPage } from './pages/RoadMapPage';
import { DamageReportsPage } from './pages/DamageReportsPage';
import { RepairPriorityPage } from './pages/RepairPriorityPage';
import { BudgetOptimizerPage } from './pages/BudgetOptimizerPage';
import { ClosureSimulatorPage } from './pages/ClosureSimulatorPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Validating credentials...</span>
        </div>
      </div>
    );
  }

  // Allow easy demo access or require login
  if (!isAuthenticated && !localStorage.getItem('rw_token')) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/map" element={<RoadMapPage />} />
              <Route path="/segments" element={<RoadInventoryPage />} />
              <Route path="/damage-reports" element={<DamageReportsPage />} />
              <Route path="/priorities" element={<RepairPriorityPage />} />
              <Route path="/budget" element={<BudgetOptimizerPage />} />
              <Route path="/closure" element={<ClosureSimulatorPage />} />
              <Route path="/scheduling" element={<SchedulingPage />} />
              <Route path="/work-orders" element={<WorkOrdersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
