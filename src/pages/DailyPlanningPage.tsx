import { useData } from "../contexts/DataContext";
import Section from "../components/Section";
import TodoList from "../components/TodoList";

export default function DailyPlanningPage() {
  const { tasks, addTask, toggleTask, deleteTask } = useData();
  const anytimeTasks = tasks.filter((t) => !t.date);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-6">
      <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-8 transition-colors duration-300">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-200 tracking-tight">
            Daily Planning
          </h1>
          <p className="text-sm text-stone-400 dark:text-stone-600">
            Plan your day deliberately. Coming soon.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-5 transition-colors duration-300">
        <Section title="Anytime" subtitle="Tasks without a specific day">
          <TodoList tasks={anytimeTasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />
        </Section>
      </div>
    </main>
  );
}
