import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

// Auth pages
import Login from './features/auth/Login';
import OTPLogin from './portals/patient/OTPLogin';
import ProfileComplete from './portals/patient/ProfileComplete';

// Patient portal
import PatientLayout from './portals/patient/PatientLayout';
import PatientDashboard from './portals/patient/PatientDashboard';
import PatientAppointments from './portals/patient/PatientAppointments';
import PatientMedicalRecords from './portals/patient/PatientMedicalRecords';
import PatientPrescriptions from './portals/patient/PatientPrescriptions';

// Doctor portal
import DoctorLayout from './portals/doctor/DoctorLayout';
import DoctorSchedule from './portals/doctor/DoctorSchedule';
import DoctorPatients from './portals/doctor/DoctorPatients';

// Admin portal (layout + dashboard + reused feature pages)
import AdminLayout from './portals/admin/AdminLayout';
import AdminDashboard from './portals/admin/AdminDashboard';
import PatientsList from './features/patients/PatientsList';
import AppointmentsList from './features/appointments/AppointmentsList';
import BillingDashboard from './features/billing/BillingDashboard';

// ── Guards ──────────────────────────────────────────────────────────────────

function RequireAuth({ role, children }: { role?: string; children: React.ReactElement }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    // Redirect to appropriate login page based on desired role
    if (role === 'PATIENT') return <Navigate to="/patient/login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Wrong portal for this user — send them to their own portal
    if (user.role === 'PATIENT') return <Navigate to="/patient" replace />;
    if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'PATIENT') return <Navigate to="/patient" replace />;
  if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
  return <Navigate to="/admin" replace />;
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → redirect by role */}
        <Route path="/" element={<RootRedirect />} />

        {/* Staff login */}
        <Route path="/login" element={<Login />} />

        {/* Patient auth */}
        <Route path="/patient/login" element={<OTPLogin />} />
        <Route
          path="/patient/complete-profile"
          element={
            <RequireAuth role="PATIENT">
              <ProfileComplete />
            </RequireAuth>
          }
        />

        {/* ── Patient Portal ── */}
        <Route
          path="/patient"
          element={
            <RequireAuth role="PATIENT">
              <PatientLayout />
            </RequireAuth>
          }
        >
          <Route index element={<PatientDashboard />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="medical-records" element={<PatientMedicalRecords />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
        </Route>

        {/* ── Doctor Portal ── */}
        <Route
          path="/doctor"
          element={
            <RequireAuth role="DOCTOR">
              <DoctorLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DoctorSchedule />} />
          <Route path="patients" element={<DoctorPatients />} />
        </Route>

        {/* ── Admin Portal ── */}
        <Route
          path="/admin"
          element={
            <RequireAuth role="ADMIN">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="patients" element={<PatientsList />} />
          <Route path="appointments" element={<AppointmentsList />} />
          <Route path="billing" element={<BillingDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
