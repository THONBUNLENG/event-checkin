import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";

import LoginPage from "./pages/Login";
import LayoutPage from "./components/Layout";

import DashboardPage from "./pages/Dashboard";
import DepartmentsPage from "./pages/Departments";
import PositionsPage from "./pages/Positions";
import EventsPage from "./pages/Events";
import ParticipantsPage from "./pages/Participants";
import CheckinPage from "./pages/Checkin";
import AttendancePage from "./pages/Attendance";
import CheckinPreviewPage from "./pages/CheckinPreviewPage";

function Protected() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<Protected />}>
        <Route element={<LayoutPage />}>
          <Route index element={<DashboardPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="positions" element={<PositionsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="checkin" element={<CheckinPage />} />
          <Route path="attendance" element={<AttendancePage />} />
        </Route>
        <Route
          path="/checkin-preview"
          element={<CheckinPreviewPage />}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}