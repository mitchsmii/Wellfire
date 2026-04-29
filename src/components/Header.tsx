import SunIcon from "./icons/SunIcon";
import MoonIcon from "./icons/MoonIcon";
import Flame from "./Flame";
import Wordmark from "./Wordmark";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface HeaderProps {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  onCheckinOpen: () => void;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

export default function Header({ theme, setTheme, onCheckinOpen, userEmail, onSignOut }: HeaderProps) {
  return (
    <header className="border-b border-stone-200/60 dark:border-stone-800/30 px-6 py-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame size={24} stroke="#f59e0b" />
          <Wordmark size={22} className="text-stone-900 dark:text-stone-50" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCheckinOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/40 dark:border-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
          >
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path
                d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"
                fill="currentColor"
                opacity="0.8"
              />
            </svg>
            Morning check-in
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-all"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          <div className="text-right">
            <p className="text-sm text-stone-500 dark:text-stone-400">{getGreeting()}</p>
            <p className="text-xs text-stone-400 dark:text-stone-600">{formatDate()}</p>
          </div>

          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-stone-200/40 dark:border-stone-800/30">
            <span className="text-xs text-stone-400 dark:text-stone-600 truncate max-w-[140px]">{userEmail}</span>
            <button
              onClick={onSignOut}
              className="text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
