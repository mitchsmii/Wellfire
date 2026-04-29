import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import TodayHero from "../components/TodayHero";
import DayCard from "../components/DayCard";
import Inbox from "../components/Inbox";
import IntentionBar from "../components/IntentionBar";
import Habits from "../components/Habits";
import WeeklySummary from "../components/WeeklySummary";
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
        <div className="grid grid-cols-6 gap-3 mb-4">
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
                onAddTask={(text, targetIso) => addTask(text, targetIso)}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
              />
            );
          })}
        </div>
        <WeeklySummary />
      </section>

      {/* Habits + Inbox */}
      <section className="grid grid-cols-12 gap-4">
        <Habits />

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
