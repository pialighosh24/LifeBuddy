import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { CareUsersPage } from './pages/CareUsersPage';
import { EmergencyContactsPage } from './pages/EmergencyContactsPage';
import { SosAlertsPage } from './pages/SosAlertsPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { MedicinesPage } from './pages/MedicinesPage';
import { CommunicationPage } from './pages/CommunicationPage';
import { SituationGuidancePage } from './pages/SituationGuidancePage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="care-users" element={<CareUsersPage />} />
              <Route path="routines" element={<RoutinesPage />} />
              <Route path="medicines" element={<MedicinesPage />} />
              <Route path="communication" element={<CommunicationPage />} />
              <Route path="situations" element={<SituationGuidancePage />} />
              <Route path="emergency-contacts" element={<EmergencyContactsPage />} />
              <Route path="sos-alerts" element={<SosAlertsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
