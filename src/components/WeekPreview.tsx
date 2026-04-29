import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TimeBlock, Task } from "../types";
import { getNextDays, toISODate } from "../lib/date";

interface Props {
  blocks: TimeBlock[];
  tasks: Task[];
  days?: number;
  itemsPerDay?: number;
  onDropTask?: (taskId: string, iso: string) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "p" : "a";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

export default function WeekPreview({ blocks, tasks, days = 6, itemsPerDay = 3, onDropTask }: Props) {
  const navigate = useNavigate();
  const upcoming = getNextDays(days);
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {upcoming.map((date) => {
        const iso = toISODate(date);
        const dayBlocks = blocks
          .filter((b) => b.date === iso)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayTasks = tasks
          .filter((t) => t.date === iso && !t.done)
          .sort((a, b) => a.createdAt - b.createdAt);

        const eventItems = dayBlocks.slice(0, itemsPerDay).map((b) => ({
          kind: "event" as const,
          id: b.id,
          label: b.title,
          meta: formatHour(b.startTime),
        }));
        const remaining = itemsPerDay - eventItems.length;
        const taskItems = dayTasks.slice(0, remaining).map((t) => ({
          kind: "task" as const,
          id: t.id,
          label: t.text,
          meta: "",
        }));
        const items = [...eventItems, ...taskItems];
        const overflow = dayBlocks.length + dayTasks.length - items.length;

        return (
          <button
            key={iso}
            onClick={() => navigate(`/weekly?date=${iso}`)}
            onDragOver={(e) => {
              if (!onDropTask) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverIso !== iso) setDragOverIso(iso);
            }}
            onDragLeave={() => {
              if (dragOverIso === iso) setDragOverIso(null);
            }}
            onDrop={(e) => {
              if (!onDropTask) return;
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain");
              if (taskId) onDropTask(taskId, iso);
              setDragOverIso(null);
            }}
            className={`text-left rounded-xl border px-2.5 py-2 transition-all flex flex-col gap-1.5 ${
              dragOverIso === iso
                ? "border-amber-400/70 bg-amber-50/70 dark:bg-amber-500/10 ring-2 ring-amber-400/40"
                : "border-stone-200/40 dark:border-stone-800/30 bg-white/60 dark:bg-stone-900/20 hover:border-amber-400/50 dark:hover:border-amber-400/40 hover:bg-white dark:hover:bg-stone-900/40"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {DAY_LABELS[date.getDay()]}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-stone-600">
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            {items.length === 0 ? (
              <span className="text-xs text-stone-400 dark:text-stone-600 italic">Nothing planned</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex items-baseline gap-1.5 text-xs leading-snug">
                    {item.kind === "event" ? (
                      <>
                        <span className="text-stone-400 dark:text-stone-600 shrink-0 tabular-nums">{item.meta}</span>
                        <span className="text-stone-700 dark:text-stone-200 truncate">{item.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0 mt-1.5" />
                        <span className="text-stone-600 dark:text-stone-300 truncate">{item.label}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {overflow > 0 && (
              <span className="text-[10px] text-stone-400 dark:text-stone-600 mt-auto">+{overflow} more</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
