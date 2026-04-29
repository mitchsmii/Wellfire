import { useData } from "../contexts/DataContext";
import Section from "../components/Section";
import Schedule from "../components/Schedule";

export default function WeeklyPlanningPage() {
  const {
    blocks,
    tasks,
    addBlock,
    updateBlock,
    deleteBlock,
    addTask,
    toggleTask,
    deleteTask,
  } = useData();

  return (
    <main className="max-w-7xl mx-auto px-6 py-6">
      <div className="rounded-2xl border border-stone-200/40 dark:border-stone-800/25 bg-white/80 dark:bg-stone-900/20 p-5 transition-colors duration-300">
        <Section title="This Week" subtitle="Click any slot to add a block">
          <Schedule
            blocks={blocks}
            onAdd={addBlock}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
            tasks={tasks}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        </Section>
      </div>
    </main>
  );
}
