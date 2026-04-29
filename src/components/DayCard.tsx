import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TimeBlock, Task } from "../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeShort(t: string) {
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "p" : "a";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${p}` : `${h12}:${String(m).padStart(2, "0")}${p}`;
}

interface Props {
  date: Date;
  iso: string;
  blocks: TimeBlock[];
  tasks: Task[];
  accent?: boolean;
  onDropTask?: (taskId: string, iso: string) => void;
}

export default function DayCard({ date, iso, blocks, tasks, accent = false, onDropTask }: Props) {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);

  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const events = sortedBlocks.slice(0, 3);
  const extraE = sortedBlocks.length - events.length;

  const pendingTasks = tasks.filter((t) => !t.done);
  const isWeekend = [0, 6].includes(date.getDay());

  return (
    <button
      onClick={() => navigate(`/weekly?date=${iso}`)}
      onDragOver={(e) => {
        if (!onDropTask) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => {
        if (dragOver) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!onDropTask) return;
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) onDropTask(taskId, iso);
        setDragOver(false);
      }}
      className={`text-left rounded-xl border px-3 py-2.5 flex flex-col gap-2 transition-colors ${
        dragOver
          ? "border-amber-400/80 bg-amber-50/80 dark:bg-amber-500/10 ring-2 ring-amber-400/50"
          : accent
            ? "border-amber-400/50 bg-amber-50/60 dark:bg-amber-500/[0.06] hover:bg-amber-50 dark:hover:bg-amber-500/[0.1]"
            : "border-stone-200/50 dark:border-stone-800/30 bg-white/60 dark:bg-stone-900/20 hover:border-amber-400/40"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            isWeekend
              ? "text-amber-600/70 dark:text-amber-400/70"
              : "text-stone-500 dark:text-stone-400"
          }`}
        >
          {DAY_LABELS[date.getDay()]}
        </span>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 tabular-nums">
          {date.getDate()}
        </span>
      </div>

      {events.length === 0 ? (
        <span className="text-[11px] italic text-stone-400 dark:text-stone-600">Open day</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-1.5 text-[11px] leading-tight">
              <span className="tabular-nums text-stone-400 dark:text-stone-600 shrink-0 w-7">
                {formatTimeShort(e.startTime)}
              </span>
              <span className="text-stone-700 dark:text-stone-200 truncate">{e.title}</span>
            </li>
          ))}
          {extraE > 0 && (
            <li className="text-[10px] text-stone-400 dark:text-stone-600">
              +{extraE} event{extraE > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}

      {pendingTasks.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-stone-200/40 dark:border-stone-800/30">
          {pendingTasks.slice(0, 2).map((t) => (
            <span
              key={t.id}
              className="text-[10px] flex items-center gap-1 text-stone-500 dark:text-stone-400"
            >
              <span className="w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-500" />
              {t.text.length > 18 ? t.text.slice(0, 18) + "…" : t.text}
            </span>
          ))}
          {pendingTasks.length > 2 && (
            <span className="text-[10px] text-stone-400 dark:text-stone-600">
              +{pendingTasks.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
