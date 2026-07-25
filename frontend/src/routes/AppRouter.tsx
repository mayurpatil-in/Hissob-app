import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { PrivateRoute, PublicRoute } from './Guards';
import AppShell from '../layouts/AppShell';

// Lazy-loaded pages
const LoginPage         = lazy(() => import('../modules/auth/LoginPage'));
const Dashboard         = lazy(() => import('../modules/dashboard/Dashboard'));
const ReceiptsPage      = lazy(() => import('../modules/receipts/ReceiptsPage'));
const ExpensesPage      = lazy(() => import('../modules/expenses/ExpensesPage'));
const DonorsPage        = lazy(() => import('../modules/donors/DonorsPage'));
const ReportsPage       = lazy(() => import('../modules/reports/ReportsPage'));
const FinancialYearPage = lazy(() => import('../modules/financial-year/FinancialYearPage'));
const AuditPage         = lazy(() => import('../modules/audit/AuditPage'));
const SuperAdminPage    = lazy(() => import('../modules/super-admin/SuperAdminPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
    <Spin size="large" />
  </div>
);

const AppRouter: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Private — wrapped in AppShell */}
      <Route path="/*" element={
        <PrivateRoute>
          <AppShell>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dashboard"      element={<Dashboard />} />
                <Route path="/financial-year" element={<FinancialYearPage />} />
                <Route path="/receipts"       element={<ReceiptsPage />} />
                <Route path="/expenses"       element={<ExpensesPage />} />
                <Route path="/donors"         element={<DonorsPage />} />
                <Route path="/reports"        element={<ReportsPage />} />
                <Route path="/audit"          element={<AuditPage />} />
                <Route path="/super-admin"    element={<SuperAdminPage />} />
                <Route path="*"               element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </AppShell>
        </PrivateRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default AppRouter;
