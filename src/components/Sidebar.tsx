import { NavLink } from "react-router-dom";
import HomeIcon from "./icons/HomeIcon";
import CalendarIcon from "./icons/CalendarIcon";
import CalendarDaysIcon from "./icons/CalendarDaysIcon";
import TargetIcon from "./icons/TargetIcon";
import LogOutIcon from "./icons/LogOutIcon";
import Flame from "./Flame";

interface SidebarProps {
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/daily", label: "Daily", Icon: CalendarIcon, end: false },
  { to: "/weekly", label: "Weekly", Icon: CalendarDaysIcon, end: false },
  { to: "/goals", label: "Goals", Icon: TargetIcon, end: false },
];

export default function Sidebar({ onSignOut }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-stretch py-5 border-r border-stone-200/60 dark:border-stone-800/30 bg-[#faf7f2] dark:bg-[#0f0e0c] transition-colors duration-300 z-30">
      {/* Logo */}
      <div className="flex items-center justify-center pb-5 mb-2 border-b border-stone-200/40 dark:border-stone-800/20">
        <Flame size={22} stroke="#f59e0b" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                "flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-medium tracking-wide transition-all",
                isActive
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100/60 dark:hover:bg-stone-800/40",
              ].join(" ")
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign out pinned to bottom */}
      <div className="mt-auto px-2">
        <button
          onClick={onSignOut}
          title="Sign out"
          className="w-full flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-medium tracking-wide text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-all"
        >
          <LogOutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
