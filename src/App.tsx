import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import LoadingScreen from "./components/LoadingScreen";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import DailyPlanningPage from "./pages/DailyPlanningPage";
import WeeklyPlanningPage from "./pages/WeeklyPlanningPage";
import GoalSettingPage from "./pages/GoalSettingPage";
import AuthPage from "./pages/AuthPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen theme="dark" />;
  if (!session) return <Navigate to="/login" replace />;

  return <DataProvider>{children}</DataProvider>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="daily" element={<DailyPlanningPage />} />
        <Route path="weekly" element={<WeeklyPlanningPage />} />
        <Route path="goals" element={<GoalSettingPage />} />
      </Route>
    </Routes>
  );
}
