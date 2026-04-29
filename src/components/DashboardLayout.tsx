import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./Header";
import Sidebar from "./Sidebar";
import CheckIn from "./CheckIn";
import LoadingScreen from "./LoadingScreen";

export default function DashboardLayout() {
  const { session, signOut } = useAuth();
  const { goals, tasks, blocks, loading } = useData();
  const [theme, setTheme] = useLocalStorage<"dark" | "light">("wf-theme", "dark");
  const [intention] = useLocalStorage("wf-intention", "");
  const [checkinOpen, setCheckinOpen] = useState(false);

  if (loading) return <LoadingScreen theme={theme} />;

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div
        className={`min-h-screen bg-[#faf7f2] text-stone-700 dark:bg-[#0f0e0c] dark:text-stone-300 transition-all duration-300 ${checkinOpen ? "mr-[420px]" : ""}`}
      >
        <Sidebar onSignOut={signOut} />

        {/* Content area sits to the right of the fixed sidebar */}
        <div className="ml-20">
          <Header
            theme={theme}
            setTheme={setTheme}
            onCheckinOpen={() => setCheckinOpen(true)}
            userEmail={session?.user.email ?? ""}
            onSignOut={signOut}
          />
          <Outlet />
        </div>
      </div>

      <CheckIn
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        goals={goals}
        tasks={tasks}
        blocks={blocks}
        intention={intention}
      />
    </div>
  );
}
