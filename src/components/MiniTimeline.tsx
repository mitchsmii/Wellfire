import { useEffect, useState } from "react";
import type { TimeBlock } from "../types";

interface Props {
  blocks: TimeBlock[];
  startHour?: number;
  endHour?: number;
  height?: number;
}

const COLORS: Record<string, { bg: string; bd: string; tx: string }> = {
  amber: {
    bg: "bg-amber-500/15",
    bd: "border-amber-500/30",
    tx: "text-amber-700 dark:text-amber-300",
  },
  sky: {
    bg: "bg-sky-500/15",
    bd: "border-sky-500/30",
    tx: "text-sky-700 dark:text-sky-300",
  },
  blue: {
    bg: "bg-blue-500/15",
    bd: "border-blue-500/30",
    tx: "text-blue-700 dark:text-blue-300",
  },
  green: {
    bg: "bg-emerald-500/15",
    bd: "border-emerald-500/30",
    tx: "text-emerald-700 dark:text-emerald-300",
  },
  purple: {
    bg: "bg-violet-500/15",
    bd: "border-violet-500/30",
    tx: "text-violet-700 dark:text-violet-300",
  },
  rose: {
    bg: "bg-rose-500/15",
    bd: "border-rose-500/30",
    tx: "text-rose-700 dark:text-rose-300",
  },
};

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

export default function MiniTimeline({ blocks, startHour = 8, endHour = 19, height = 360 }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const START = startHour * 60;
  const END = endHour * 60;
  const SPAN = END - START;
  const pct = (m: number) => ((m - START) / SPAN) * height;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = nowMin >= START && nowMin <= END;

  const tickHours: number[] = [];
  for (let h = startHour + 1; h <= endHour; h += 2) tickHours.push(h);

  const sortedBlocks = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div
      className="relative rounded-2xl border border-stone-200/50 dark:border-stone-800/40 bg-white/50 dark:bg-stone-900/40 p-4"
      style={{ height: height + 32 }}
    >
      {tickHours.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none"
          style={{ top: 16 + pct(h * 60) }}
        >
          <span className="text-[9px] font-mono tabular-nums text-stone-400 dark:text-stone-600 w-10 text-right pr-1">
            {formatHourLabel(`${h}:00`)}
          </span>
          <div className="flex-1 border-t border-dashed border-stone-200/60 dark:border-stone-800/40" />
        </div>
      ))}

      <div className="absolute top-4 left-12 right-3 bottom-4">
        {sortedBlocks.map((b) => {
          const s = toMin(b.startTime);
          const e = toMin(b.endTime);
          if (e < START || s > END) return null;
          const top = pct(Math.max(s, START));
          const h = Math.max(22, pct(Math.min(e, END)) - pct(Math.max(s, START)));
          const c = COLORS[b.color ?? "amber"] ?? COLORS.amber;
          return (
            <div
              key={b.id}
              className={`absolute left-0 right-0 rounded-lg border ${c.bd} ${c.bg} px-2.5 py-1 overflow-hidden`}
              style={{ top, height: h }}
            >
              <div className={`text-xs font-semibold truncate ${c.tx}`}>{b.title}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">
                {formatHourLabel(b.startTime)} – {formatHourLabel(b.endTime)}
              </div>
            </div>
          );
        })}

        {showNow && (
          <div
            className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
            style={{ top: pct(nowMin) }}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 -ml-1 shrink-0 pulse-soft" />
            <div className="flex-1 h-px bg-amber-500/70" />
            <span className="text-[9px] tabular-nums text-amber-600 dark:text-amber-400 font-semibold ml-1">
              NOW
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
