import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { TimeBlock, Task } from "../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  onAddTask?: (text: string, iso: string) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
}

export default function DayCard({
  date,
  iso,
  blocks,
  tasks,
  accent = false,
  onDropTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: Props) {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [open, setOpen] = useState(false);
  const justDroppedRef = useRef(false);

  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const events = sortedBlocks.slice(0, 3);
  const extraE = sortedBlocks.length - events.length;

  const pendingTasks = tasks.filter((t) => !t.done);
  const isWeekend = [0, 6].includes(date.getDay());
  const hasModalHandlers = !!(onAddTask || onToggleTask || onDeleteTask);

  function handleClick() {
    if (justDroppedRef.current) {
      justDroppedRef.current = false;
      return;
    }
    if (hasModalHandlers) {
      setOpen(true);
    } else {
      navigate(`/weekly?date=${iso}`);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
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
          justDroppedRef.current = true;
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

      {open && hasModalHandlers && (
        <DayDetailModal
          date={date}
          iso={iso}
          blocks={sortedBlocks}
          tasks={tasks}
          onClose={() => setOpen(false)}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
          onOpenWeekly={() => {
            setOpen(false);
            navigate(`/weekly?date=${iso}`);
          }}
        />
      )}
    </>
  );
}

interface ModalProps {
  date: Date;
  iso: string;
  blocks: TimeBlock[];
  tasks: Task[];
  onClose: () => void;
  onAddTask?: (text: string, iso: string) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onOpenWeekly: () => void;
}

function DayDetailModal({
  date,
  iso,
  blocks,
  tasks,
  onClose,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onOpenWeekly,
}: ModalProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [theme] = useLocalStorage<"dark" | "light">("wf-theme", "dark");

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !onAddTask) return;
    onAddTask(text, iso);
    setDraft("");
  }

  const headerLabel = `${DAY_LABELS_LONG[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;

  return createPortal(
    <div
      className={theme === "dark" ? "dark" : ""}
    >
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-stone-200/60 dark:border-stone-800/40 bg-white dark:bg-stone-900 shadow-2xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
              {iso}
            </div>
            <div className="text-base font-semibold text-stone-800 dark:text-stone-100 mt-0.5">
              {headerLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {blocks.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
              Scheduled
            </div>
            <ul className="flex flex-col gap-1">
              {blocks.map((b) => (
                <li
                  key={b.id}
                  className="flex items-baseline gap-2 text-xs"
                >
                  <span className="tabular-nums text-stone-400 dark:text-stone-600 shrink-0 w-12">
                    {formatTimeShort(b.startTime)}
                  </span>
                  <span className="text-stone-700 dark:text-stone-200 truncate">{b.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
            Tasks
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs italic text-stone-400 dark:text-stone-600">
              Nothing yet — add one below.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((t) => (
                <li key={t.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => onToggleTask?.(t.id)}
                    aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                    className={`flex items-center justify-center w-4 h-4 rounded border transition-all shrink-0 ${
                      t.done
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-stone-300 dark:border-stone-700 hover:border-amber-400"
                    }`}
                  >
                    {t.done && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      t.done
                        ? "line-through text-stone-400 dark:text-stone-600"
                        : "text-stone-700 dark:text-stone-200"
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    onClick={() => onDeleteTask?.(t.id)}
                    aria-label="Delete task"
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 3L9 9M9 3L3 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={submitTask} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add a task for ${DAY_LABELS_LONG[date.getDay()]}…`}
            className="flex-1 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800/50 bg-white dark:bg-stone-900/60 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-amber-400/60 dark:focus:border-amber-500/40 transition-colors"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </form>

        <button
          onClick={onOpenWeekly}
          className="text-[11px] text-stone-400 dark:text-stone-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors self-start"
        >
          Open in weekly view →
        </button>
      </div>
    </div>
    </div>,
    document.body,
  );
}
