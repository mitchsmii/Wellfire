import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TimeBlock, Task, Goal } from "../types";
import Flame from "./Flame";
import MiniTimeline from "./MiniTimeline";

interface Props {
  todayBlocks: TimeBlock[];
  todayTasks: Task[];
  goals: Goal[];
  onToggleTask: (id: string) => void;
  onAddTask: (text: string) => void;
  onDeleteTask: (id: string) => void;
  totalTaskCount: number;
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHourLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${p}` : `${h12}:${String(m).padStart(2, "0")}${p}`;
}

function formatClockTime(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const p = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${p}`;
}

export default function TodayHero({
  todayBlocks,
  todayTasks,
  goals,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  totalTaskCount,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [newTask, setNewTask] = useState("");

  // Display order that we control locally so completed tasks can "slide" to the bottom.
  const [orderIds, setOrderIds] = useState<string[]>(() => todayTasks.map((t) => t.id));
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const slideTimersRef = useRef<Map<string, number>>(new Map());

  // Sync orderIds with incoming tasks: keep current order, append new, drop removed.
  useEffect(() => {
    setOrderIds((prev) => {
      const incomingIds = todayTasks.map((t) => t.id);
      const incomingSet = new Set(incomingIds);
      const kept = prev.filter((id) => incomingSet.has(id));
      const appended = incomingIds.filter((id) => !prev.includes(id));
      return [...kept, ...appended];
    });
  }, [todayTasks]);

  // Cleanup any pending slide timers on unmount.
  useEffect(() => {
    return () => {
      slideTimersRef.current.forEach((t) => clearTimeout(t));
      slideTimersRef.current.clear();
    };
  }, []);

  // FLIP: animate items to their new positions whenever orderIds changes.
  useLayoutEffect(() => {
    const prev = prevRectsRef.current;
    const next = new Map<string, DOMRect>();
    itemRefs.current.forEach((el, id) => {
      next.set(id, el.getBoundingClientRect());
    });
    itemRefs.current.forEach((el, id) => {
      const prevRect = prev.get(id);
      const nextRect = next.get(id);
      if (!prevRect || !nextRect) return;
      const dy = prevRect.top - nextRect.top;
      if (dy === 0) return;
      el.style.transform = `translateY(${dy}px)`;
      el.style.transition = "transform 0s";
      requestAnimationFrame(() => {
        el.style.transform = "";
        el.style.transition = "transform 450ms cubic-bezier(0.22, 0.61, 0.36, 1)";
      });
    });
    prevRectsRef.current = next;
  }, [orderIds]);

  function handleToggle(id: string) {
    const current = todayTasks.find((t) => t.id === id);
    const willBeDone = current ? !current.done : false;
    onToggleTask(id);

    // Clear any existing slide timer for this task (e.g. re-checking quickly).
    const existing = slideTimersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
      slideTimersRef.current.delete(id);
    }

    if (willBeDone) {
      // Wait 2s, then snapshot current rects and move this id to the bottom.
      const handle = window.setTimeout(() => {
        const snapshot = new Map<string, DOMRect>();
        itemRefs.current.forEach((el, k) => snapshot.set(k, el.getBoundingClientRect()));
        prevRectsRef.current = snapshot;
        setOrderIds((prev) => {
          const without = prev.filter((x) => x !== id);
          return [...without, id];
        });
        slideTimersRef.current.delete(id);
      }, 2000);
      slideTimersRef.current.set(id, handle);
    }
  }

  function handleAddTask() {
    const text = newTask.trim();
    if (!text) return;
    onAddTask(text);
    setNewTask("");
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sortedBlocks = [...todayBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nextBlock = sortedBlocks.find((b) => toMin(b.endTime) > nowMin);

  const taskById = new Map(todayTasks.map((t) => [t.id, t]));
  const orderedTasks = orderIds
    .map((id) => taskById.get(id))
    .filter((t): t is Task => Boolean(t));
  const visibleTasks = orderedTasks.slice(0, 4);
  const pending = todayTasks.filter((t) => !t.done);
  const done = todayTasks.filter((t) => t.done);

  const dateLine = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const weekNum = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7,
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-stone-200/50 dark:border-stone-800/40 bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-500/[0.06] dark:via-stone-900/40 dark:to-stone-900/10 p-8">
      <div className="absolute -right-10 -top-10 opacity-20 dark:opacity-15 pointer-events-none text-amber-500">
        <Flame size={320} />
      </div>

      <div className="relative grid grid-cols-12 gap-8">
        <div className="col-span-7 flex flex-col gap-6">
          {/* Date stamp */}
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              {dateLine}
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-600">Week {weekNum}</span>
          </div>

          {/* Up next */}
          {nextBlock ? (
            <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-white/70 dark:bg-stone-900/40 px-4 py-3 w-fit">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="text-amber-600 dark:text-amber-400"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600 font-semibold">
                  Up next · in {Math.max(0, toMin(nextBlock.startTime) - nowMin)} min
                </div>
                <div className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {nextBlock.title}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {formatHourLabel(nextBlock.startTime)} – {formatHourLabel(nextBlock.endTime)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-stone-200/50 dark:border-stone-800/30 bg-white/40 dark:bg-stone-900/30 px-4 py-3 w-fit">
              <div className="text-xs text-stone-500 dark:text-stone-400 italic">
                Nothing else scheduled — breathe.
              </div>
            </div>
          )}

          {/* Today's focus */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
                  Today's focus
                </div>
                <div className="text-xs text-stone-400 dark:text-stone-600">
                  {pending.length} to go · {done.length} done
                </div>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {totalTaskCount} task{totalTaskCount === 1 ? "" : "s"}
              </span>
            </div>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-stone-600 italic mb-2">
                Nothing on the list yet — add one below.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 mb-2">
                {visibleTasks.map((t) => {
                  const goal = t.goalId ? goals.find((g) => g.id === t.goalId) : undefined;
                  return (
                    <li
                      key={t.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(t.id, el);
                        else itemRefs.current.delete(t.id);
                      }}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/60 dark:hover:bg-stone-900/40 transition-colors will-change-transform"
                    >
                      <button
                        onClick={() => handleToggle(t.id)}
                        className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all ${
                          t.done
                            ? "bg-amber-500 border-amber-500"
                            : "border-stone-300/70 dark:border-stone-600/60 hover:border-amber-400"
                        }`}
                      >
                        {t.done && (
                          <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                            <path
                              d="M1 4l3 3 6-6"
                              stroke="white"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm leading-snug ${
                          t.done
                            ? "line-through text-stone-400 dark:text-stone-600"
                            : "text-stone-700 dark:text-stone-200"
                        }`}
                      >
                        {t.text}
                      </span>
                      {goal && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                          {goal.text.split(" ").slice(0, 2).join(" ")}…
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-600 hover:text-rose-400 transition-all text-xs shrink-0"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Quick add */}
            <div className="flex items-center gap-2 mt-1 rounded-xl border border-stone-200/50 dark:border-stone-800/40 bg-white/70 dark:bg-stone-900/40 focus-within:border-amber-400/60 dark:focus-within:border-amber-500/50 transition-colors px-3 py-2">
              <span className="w-5 h-5 rounded-md border border-dashed border-stone-300/70 dark:border-stone-600/60 shrink-0 flex items-center justify-center text-stone-400 dark:text-stone-600 text-sm leading-none">
                +
              </span>
              <input
                placeholder="Add a task for today..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                  if (e.key === "Escape") setNewTask("");
                }}
                className="flex-1 bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none"
              />
              {newTask.trim() && (
                <button
                  onClick={handleAddTask}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20"
                >
                  Add
                </button>
              )}
              <span className="text-[10px] text-stone-400 dark:text-stone-600 shrink-0 hidden sm:inline tabular-nums">
                ↵
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-5">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
              Today's rhythm
            </div>
            <div className="text-xs text-stone-400 dark:text-stone-600 tabular-nums">
              {formatClockTime(now)}
            </div>
          </div>
          <MiniTimeline blocks={todayBlocks} />
        </div>
      </div>
    </section>
  );
}
