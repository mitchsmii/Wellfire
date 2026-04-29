import { useMemo, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { toISODate } from "../lib/date";
import Flame from "./Flame";

interface Habit {
  id: string;
  name: string;
  completedDates: string[];
  createdAt: string;
}

function uid() {
  return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

function currentStreak(dates: Set<string>, todayISO: string): number {
  let cursor = todayISO;
  if (!dates.has(cursor)) {
    cursor = shiftISO(cursor, -1);
    if (!dates.has(cursor)) return 0;
  }
  let count = 0;
  while (dates.has(cursor)) {
    count++;
    cursor = shiftISO(cursor, -1);
  }
  return count;
}

function bestStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (shiftISO(sorted[i - 1], 1) === sorted[i]) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}

export default function Habits() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("wf-habits", []);
  const [draft, setDraft] = useState("");

  const todayISO = toISODate(new Date());
  const last7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftISO(todayISO, -(6 - i))),
    [todayISO],
  );

  const stats = useMemo(() => {
    let doneToday = 0;
    let bestActive = 0;
    for (const h of habits) {
      const set = new Set(h.completedDates);
      if (set.has(todayISO)) doneToday++;
      const cs = currentStreak(set, todayISO);
      if (cs > bestActive) bestActive = cs;
    }
    return { doneToday, bestActive };
  }, [habits, todayISO]);

  function addHabit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setHabits([
      ...habits,
      { id: uid(), name, completedDates: [], createdAt: new Date().toISOString() },
    ]);
    setDraft("");
  }

  function toggleToday(id: string) {
    setHabits(
      habits.map((h) => {
        if (h.id !== id) return h;
        const set = new Set(h.completedDates);
        if (set.has(todayISO)) set.delete(todayISO);
        else set.add(todayISO);
        return { ...h, completedDates: Array.from(set) };
      }),
    );
  }

  function removeHabit(id: string) {
    setHabits(habits.filter((h) => h.id !== id));
  }

  return (
    <div className="col-span-8 rounded-2xl border border-stone-200/50 dark:border-stone-800/30 bg-white/70 dark:bg-stone-900/25 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
            Habits
          </div>
          <div className="text-sm text-stone-400 dark:text-stone-600">
            Daily streaks · don't break the chain
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/40 dark:border-amber-500/15">
            <Flame size={14} stroke="#f59e0b" />
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
              {stats.bestActive}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-amber-600/80 dark:text-amber-500/70">
              best
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
              {stats.doneToday}/{habits.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-600">
              today
            </div>
          </div>
        </div>
      </div>

      {habits.length === 0 ? (
        <p className="text-sm text-stone-400 dark:text-stone-600 italic mb-4">
          No habits yet. Add one below — small things, every day.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
          {habits.map((h) => {
            const set = new Set(h.completedDates);
            const cs = currentStreak(set, todayISO);
            const best = bestStreak(h.completedDates);
            const doneToday = set.has(todayISO);
            return (
              <li
                key={h.id}
                className="group flex items-center gap-3 py-1"
              >
                <button
                  onClick={() => toggleToday(h.id)}
                  aria-label={doneToday ? "Mark as not done today" : "Mark as done today"}
                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all shrink-0 ${
                    doneToday
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-stone-300 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500"
                  }`}
                >
                  {doneToday && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-700 dark:text-stone-200 truncate">
                      {h.name}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                      <Flame size={11} />
                      {cs}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-0.5">
                      {last7.map((iso) => (
                        <span
                          key={iso}
                          className={`w-1.5 h-1.5 rounded-full ${
                            set.has(iso)
                              ? "bg-amber-500 dark:bg-amber-400"
                              : "bg-stone-200 dark:bg-stone-800"
                          }`}
                          title={iso}
                        />
                      ))}
                    </div>
                    {best > cs && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-600 uppercase tracking-wider">
                        best {best}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeHabit(h.id)}
                  aria-label="Remove habit"
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={addHabit} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a habit (e.g. Read 20 min)"
          className="flex-1 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800/50 bg-white dark:bg-stone-900/40 text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none focus:border-amber-400/60 dark:focus:border-amber-500/40 transition-colors"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </div>
  );
}
