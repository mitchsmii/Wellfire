import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import Goals from './components/Goals';
import Schedule from './components/Schedule';
import TodoList from './components/TodoList';
import CheckIn from './components/CheckIn';
import AuthPage from './components/AuthPage';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-stone-800 dark:text-stone-200 tracking-tight">{title}</h2>
        <p className="text-xs text-stone-400 dark:text-stone-600">{subtitle}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 100 11 5.5 5.5 0 007-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface IntentionBlockProps {
  savedText: string;
  onSave: (text: string) => void;
}

function IntentionBlock({ savedText, onSave }: IntentionBlockProps) {
  const [intention, setIntention] = useState(savedText);
  const [saved, setSaved] = useState(savedText !== '');

  function handleSave() {
    const text = intention.trim();
    if (!text) return;
    onSave(text);
    setSaved(true);
  }

  return (
    <div className="flex items-start gap-5">
      <span className="text-4xl leading-none text-amber-400/70 dark:text-amber-500/50 select-none font-serif mt-0.5">"</span>
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/70 dark:text-amber-500/50">
          Today's Intention
        </span>
        {saved ? (
          <div className="flex items-baseline gap-3 group">
            <p className="flex-1 text-stone-700 dark:text-stone-200 text-base leading-snug italic">{savedText}</p>
            <button
              onClick={() => { setSaved(false); setIntention(savedText); }}
              className="opacity-0 group-hover:opacity-100 text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-all shrink-0"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              autoFocus={false}
              placeholder="What do you intend to bring to today?"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="flex-1 bg-transparent text-base text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none"
            />
            {intention.trim() && (
              <button
                onClick={handleSave}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
              >
                Set
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen({ theme }: { theme: string }) {
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#faf7f2] dark:bg-[#0f0e0c] flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 28 28" fill="none" className="w-8 h-8 animate-pulse">
            <path
              d="M14 3C14 3 8 9 8 15a6 6 0 0012 0c0-3-2-5-2-5s-.5 2.5-2 3.5C17 11 14 3 14 3z"
              fill="url(#flame-load)"
            />
            <defs>
              <linearGradient id="flame-load" x1="14" y1="3" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-sm text-stone-400 dark:text-stone-600">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { session, loading: authLoading, signOut } = useAuth();
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('wf-theme', 'dark');
  const [intention, setIntention] = useLocalStorage('wf-intention', '');

  if (authLoading) return <LoadingScreen theme={theme} />;
  if (!session) return <AuthPage theme={theme} />;

  return (
    <DataProvider>
      <AppContent
        theme={theme}
        setTheme={setTheme}
        intention={intention}
        setIntention={setIntention}
        onSignOut={signOut}
        userEmail={session.user.email ?? ''}
      />
    </DataProvider>
  );
}

interface AppContentProps {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  intention: string;
  setIntention: (t: string) => void;
  onSignOut: () => Promise<void>;
  userEmail: string;
}

function AppContent({ theme, setTheme, intention, setIntention, onSignOut, userEmail }: AppContentProps) {
  const {
    goals, blocks, tasks, loading,
    addGoal, editGoal, deleteGoal,
    addBlock, updateBlock, deleteBlock,
    addTask, toggleTask, deleteTask,
  } = useData();
  const [checkinOpen, setCheckinOpen] = useState(false);

  if (loading) return <LoadingScreen theme={theme} />;

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className={`min-h-screen bg-[#faf7f2] text-stone-700 dark:bg-[#0f0e0c] dark:text-stone-300 transition-all duration-300 ${checkinOpen ? 'mr-[420px]' : ''}`}>

        {/* Header */}
        <header className="border-b border-stone-200/60 dark:border-stone-800/30 px-6 py-4 transition-colors duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6 shrink-0">
                <path
                  d="M14 3C14 3 8 9 8 15a6 6 0 0012 0c0-3-2-5-2-5s-.5 2.5-2 3.5C17 11 14 3 14 3z"
                  fill="url(#flame2)"
                />
                <defs>
                  <linearGradient id="flame2" x1="14" y1="3" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f59e0b" />
                    <stop offset="1" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">Wellfire</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Morning check-in trigger */}
              <button
                onClick={() => setCheckinOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/40 dark:border-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
              >
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"
                    fill="currentColor" opacity="0.8" />
                </svg>
                Morning check-in
              </button>

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-all"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>

              <div className="text-right">
                <p className="text-sm text-stone-500 dark:text-stone-400">{getGreeting()}</p>
                <p className="text-xs text-stone-400 dark:text-stone-600">{formatDate()}</p>
              </div>

              {/* User / Sign out */}
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-stone-200/40 dark:border-stone-800/30">
                <span className="text-xs text-stone-400 dark:text-stone-600 truncate max-w-[140px]">{userEmail}</span>
                <button
                  onClick={onSignOut}
                  className="text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
                  title="Sign out"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Intention bar — full width */}
        <div className="border-b border-amber-200/30 dark:border-amber-900/15 px-6 py-5 bg-amber-50/70 dark:bg-amber-950/20 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <IntentionBlock savedText={intention} onSave={setIntention} />
          </div>
        </div>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid gap-6" style={{ gridTemplateColumns: '300px 1fr' }}>
            {/* Left column: To-Do + Goals */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-5 transition-colors duration-300">
                <Section title="Today's To-Do" subtitle="What needs to get done today">
                  <TodoList tasks={tasks.filter((t) => !t.date)} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />
                </Section>
              </div>
              <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-5 transition-colors duration-300">
                <Section title="Goals" subtitle="What you're working toward">
                  <Goals goals={goals} onAdd={addGoal} onEdit={editGoal} onDelete={deleteGoal} />
                </Section>
              </div>
            </div>

            {/* Weekly schedule */}
            <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-5 transition-colors duration-300">
              <Section title="This Week" subtitle="Click any slot to add a block">
                <Schedule blocks={blocks} onAdd={addBlock} onUpdate={updateBlock} onDelete={deleteBlock} tasks={tasks} onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} />
              </Section>
            </div>
          </div>
        </main>
      </div>

      {/* Morning check-in panel */}
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
