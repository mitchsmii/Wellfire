import { useEffect, useMemo, useState } from "react";
import { useData } from "../contexts/DataContext";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { toISODate, getNextDays } from "../lib/date";

interface CachedSummary {
  date: string;
  text: string;
  signature: string;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeeklySummary() {
  const { blocks, tasks } = useData();
  const [cache, setCache] = useLocalStorage<CachedSummary | null>("wf-weekly-summary", null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayISO = toISODate(new Date());

  const payload = useMemo(() => {
    const days = getNextDays(7);
    return days.map((date) => {
      const iso = toISODate(date);
      return {
        iso,
        label: DAY_LABELS[date.getDay()],
        blocks: blocks
          .filter((b) => b.date === iso)
          .map((b) => ({ title: b.title, startTime: b.startTime, endTime: b.endTime })),
        tasks: tasks.filter((t) => t.date === iso && !t.done).map((t) => ({ text: t.text })),
      };
    });
  }, [blocks, tasks]);

  const signature = useMemo(() => JSON.stringify(payload), [payload]);

  const cached = cache && cache.date === todayISO && cache.signature === signature ? cache : null;

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: payload }),
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      if (!data.summary) throw new Error("empty");
      setCache({ date: todayISO, text: data.summary, signature });
    } catch {
      setError("Couldn't generate a summary right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cached && !loading && !error) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached]);

  return (
    <section className="rounded-2xl border border-stone-200/50 dark:border-stone-800/30 bg-white/70 dark:bg-stone-900/25 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-500 dark:text-amber-400 text-sm">✦</span>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
          Week ahead · AI summary
        </div>
        {loading && (
          <span className="text-[11px] text-stone-400 dark:text-stone-600 italic">thinking…</span>
        )}
      </div>

      {loading && !cached ? (
        <div className="flex flex-col gap-2">
          <div className="h-3 rounded bg-stone-200/60 dark:bg-stone-800/60 animate-pulse w-11/12" />
          <div className="h-3 rounded bg-stone-200/60 dark:bg-stone-800/60 animate-pulse w-9/12" />
          <div className="h-3 rounded bg-stone-200/60 dark:bg-stone-800/60 animate-pulse w-10/12" />
        </div>
      ) : error && !cached ? (
        <p className="text-sm text-stone-400 dark:text-stone-600 italic">{error}</p>
      ) : cached ? (
        <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">{cached.text}</p>
      ) : null}
    </section>
  );
}
