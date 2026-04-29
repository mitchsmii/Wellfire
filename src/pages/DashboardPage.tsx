import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import TodayHero from "../components/TodayHero";
import DayCard from "../components/DayCard";
import Ring from "../components/Ring";
import Inbox from "../components/Inbox";
import IntentionBar from "../components/IntentionBar";
import { toISODate, getNextDays } from "../lib/date";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [intention, setIntention] = useLocalStorage("wf-intention", "");
  const {
    goals,
    blocks,
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
  } = useData();

  const todayISO = toISODate(new Date());

  const todayBlocks = useMemo(() => blocks.filter((b) => b.date === todayISO), [blocks, todayISO]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === todayISO), [tasks, todayISO]);
  const inboxTasks = useMemo(() => tasks.filter((t) => !t.date), [tasks]);

  const weeklyGoals = useMemo(() => goals.filter((g) => g.category === "weekly"), [goals]);

  const goalProgress = useMemo(() => {
    return weeklyGoals.map((g) => {
      if (typeof g.progress === "number") return { goal: g, pct: Math.round(g.progress * 100) };
      const linked = tasks.filter((t) => t.goalId === g.id);
      if (linked.length === 0) return { goal: g, pct: 0 };
      const doneCount = linked.filter((t) => t.done).length;
      return { goal: g, pct: Math.round((doneCount / linked.length) * 100) };
    });
  }, [weeklyGoals, tasks]);

  const overallPct = goalProgress.length
    ? Math.round(goalProgress.reduce((sum, x) => sum + x.pct, 0) / goalProgress.length)
    : 0;

  const upcomingDays = useMemo(() => getNextDays(6), []);

  return (
    <>
      <IntentionBar intention={intention} onSave={setIntention} />
      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Today Hero */}
        <TodayHero
          todayBlocks={todayBlocks}
          todayTasks={todayTasks}
          goals={goals}
          onToggleTask={toggleTask}
          onAddTask={(text) => addTask(text, todayISO)}
          onDeleteTask={deleteTask}
          totalTaskCount={todayTasks.length + inboxTasks.length}
        />

      {/* Week ahead */}
      <section>
        <div className="flex items-baseline justify-between mb-3 px-1">
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
              The week ahead
            </div>
            <div className="text-sm text-stone-400 dark:text-stone-600">
              Next 6 days · plan a little in advance
            </div>
          </div>
          <button
            onClick={() => navigate("/weekly")}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400 font-medium transition-colors"
          >
            Open weekly view →
          </button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {upcomingDays.map((date, i) => {
            const iso = toISODate(date);
            return (
              <DayCard
                key={iso}
                date={date}
                iso={iso}
                blocks={blocks.filter((b) => b.date === iso)}
                tasks={tasks.filter((t) => t.date === iso)}
                accent={i === 0}
                onDropTask={(taskId, targetIso) => updateTask(taskId, { date: targetIso })}
              />
            );
          })}
        </div>
      </section>

      {/* Goals + Inbox */}
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-8 rounded-2xl border border-stone-200/50 dark:border-stone-800/30 bg-white/70 dark:bg-stone-900/25 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
                This week's goals
              </div>
              <div className="text-sm text-stone-400 dark:text-stone-600">
                What you're working toward
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ring pct={overallPct} size={56} thickness={5} gradientId="overall-ring" />
              <div className="text-right">
                <div className="text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                  {overallPct}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-600">
                  overall
                </div>
              </div>
            </div>
          </div>

          {goalProgress.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-600 italic">
              No weekly goals yet. Set a few on the Goals page.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
              {goalProgress.map(({ goal, pct }) => (
                <li key={goal.id} className="flex items-center gap-3">
                  <Ring pct={pct} size={32} thickness={3} gradientId={`ring-${goal.id}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 dark:text-stone-200 truncate">
                      {goal.text}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-wider">
                      {pct}%
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="col-span-4 rounded-2xl border border-stone-200/50 dark:border-stone-800/30 bg-white/70 dark:bg-stone-900/25 p-5">
          <Inbox
            tasks={inboxTasks}
            onAdd={(text) => addTask(text)}
            onDelete={deleteTask}
          />
        </div>
      </section>
      </main>
    </>
  );
}
