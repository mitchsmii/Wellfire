import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { TimeBlock, GoogleCalendar, Task } from "../types";
import { toISODate, getWeekDates, weekOffsetForDate } from "../lib/date";

type CalendarView = "today" | "week" | "month";

interface Props {
  blocks: TimeBlock[];
  onAdd: (block: Omit<TimeBlock, "id">) => void;
  onUpdate: (id: string, updates: Partial<TimeBlock>) => void;
  onDelete: (id: string) => void;
  tasks?: Task[];
  onAddTask?: (text: string, date?: string) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  fixedView?: CalendarView;
}

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 40;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
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

const BLOCK_COLORS = [
  {
    label: "Amber",
    value: "amber",
    classes: "bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Blue",
    value: "blue",
    classes: "bg-blue-500/15 border border-blue-500/25 text-blue-700 dark:text-blue-300",
  },
  {
    label: "Green",
    value: "green",
    classes: "bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "Rose",
    value: "rose",
    classes: "bg-rose-500/15 border border-rose-500/25 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Purple",
    value: "purple",
    classes: "bg-violet-500/15 border border-violet-500/25 text-violet-700 dark:text-violet-300",
  },
  {
    label: "Sky",
    value: "sky",
    classes: "bg-sky-500/15 border border-sky-500/25 text-sky-700 dark:text-sky-300",
  },
];

const SWATCH_BG: Record<string, string> = {
  amber: "bg-amber-400",
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  rose: "bg-rose-400",
  purple: "bg-violet-400",
  sky: "bg-sky-400",
};

function isHexColor(color?: string) {
  return color?.startsWith("#");
}

function colorClasses(color?: string) {
  if (isHexColor(color)) return "border";
  return BLOCK_COLORS.find((c) => c.value === color)?.classes ?? BLOCK_COLORS[0].classes;
}

function hexColorStyle(color?: string): React.CSSProperties | undefined {
  if (!isHexColor(color)) return undefined;
  return {
    backgroundColor: `${color}20`,
    borderColor: `${color}66`,
    color: color,
  };
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${period}`;
}

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function snapToQuarter(mins: number) {
  return Math.round(mins / 15) * 15;
}

function getMonthCells(monthDate: Date): (Date | null)[] {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Schedule({
  blocks,
  onAdd,
  onUpdate,
  onDelete,
  tasks = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  fixedView,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const [view, setView] = useState<CalendarView>(fixedView ?? "week");
  const [weekOffset, setWeekOffset] = useState(() =>
    dateParam && !fixedView ? weekOffsetForDate(dateParam) : 0,
  );

  useEffect(() => {
    if (dateParam && !fixedView) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [monthDate, setMonthDate] = useState(new Date());
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [formDate, setFormDate] = useState(toISODate(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("amber");
  const [now, setNow] = useState(new Date());

  const [googleEvents, setGoogleEvents] = useState<TimeBlock[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [detailPos, setDetailPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const selectedBlockRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayStr = new Date().toDateString();

  // Drag state
  const [dragDay, setDragDay] = useState<number | null>(null);
  const [dragStartMins, setDragStartMins] = useState(0);
  const [dragCurrentMins, setDragCurrentMins] = useState(0);
  const dragging = dragDay !== null;
  const dragRef = useRef({ day: 0, startMins: 0, active: false, date: "" });

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showNow = nowMinutes >= START_HOUR * 60 && nowMinutes < END_HOUR * 60;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const offset = Math.max(0, ((nowMinutes - 60 - START_HOUR * 60) / 60) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = offset;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Google Calendar: check connection status and fetch calendar list
  useEffect(() => {
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((d) => {
        setGoogleConnected(d.connected);
        if (d.connected) {
          fetch("/api/google/calendars")
            .then((r) => r.json())
            .then((cals: GoogleCalendar[]) => {
              setGoogleCalendars(cals);
              const primary = cals.find((c) => c.primary);
              if (primary) setSelectedCalendarId(primary.id);
              else if (cals.length) setSelectedCalendarId(cals[0].id);
            })
            .catch(() => {});
        }
      })
      .catch(() => setGoogleConnected(false));
  }, []);

  // Google Calendar: fetch events for visible date range
  useEffect(() => {
    if (!googleConnected) return;
    let start: string, end: string;
    if (view === "month") {
      const y = monthDate.getFullYear(),
        m = monthDate.getMonth();
      start = new Date(y, m, 1).toISOString();
      end = new Date(y, m + 1, 0).toISOString();
    } else {
      start = weekDates[0].toISOString();
      end = new Date(weekDates[6].getTime() + 86400000).toISOString();
    }
    fetch(`/api/google/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((events) => setGoogleEvents(events))
      .catch(() => setGoogleEvents([]));
  }, [googleConnected, view, weekOffset, monthDate, weekDates]);

  // Merge local blocks with Google events, filtering out hidden calendars
  const allBlocks = useMemo(() => {
    const localBlocks = blocks.map((b) => ({ ...b, source: "local" as const }));
    const visibleGoogle = googleEvents.filter((e) => !e.googleCalendarId || !hiddenCalendars.has(e.googleCalendarId));
    return [...localBlocks, ...visibleGoogle];
  }, [blocks, googleEvents, hiddenCalendars]);

  function yToMinutes(clientY: number) {
    const col = columnRefs.current.get(dragRef.current.day);
    if (!col) return START_HOUR * 60;
    const rect = col.getBoundingClientRect();
    const y = clientY - rect.top;
    const mins = Math.floor((y / HOUR_HEIGHT) * 60) + START_HOUR * 60;
    return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapToQuarter(mins)));
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>, date: Date) {
    if (adding || e.button !== 0) return;
    closeDetail();
    e.preventDefault();
    const mins = yToMinutes(e.clientY);
    const finalStart = mins;
    const finalEnd = Math.min(mins + 60, END_HOUR * 60);

    setFormDate(toISODate(date));
    setStartTime(`${pad(Math.floor(finalStart / 60))}:${pad(finalStart % 60)}`);
    setEndTime(`${pad(Math.floor(finalEnd / 60))}:${pad(finalEnd % 60)}`);
    setDragDay(date.getDay());
    setDragStartMins(finalStart);
    setDragCurrentMins(finalEnd);
    setAdding(true);
  }

  function handleDragStart(e: React.MouseEvent<HTMLDivElement>, date: Date) {
    if (adding || e.button !== 0) return;
    closeDetail();
    e.preventDefault();
    const dayNum = date.getDay();
    dragRef.current = {
      day: dayNum,
      startMins: 0,
      active: true,
      date: toISODate(date),
    };
    const mins = yToMinutes(e.clientY);
    dragRef.current.startMins = mins;
    setDragDay(dayNum);
    setDragStartMins(mins);
    setDragCurrentMins(mins);
  }

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return;
    const mins = yToMinutes(e.clientY);
    setDragCurrentMins(mins);
  }, []);

  const handleDragEnd = useCallback((e: MouseEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const endMins = yToMinutes(e.clientY);
    const s = dragRef.current.startMins;
    const lo = Math.min(s, endMins);
    const hi = Math.max(s, endMins);

    // Ignore single clicks — require a meaningful drag (at least 10 min)
    if (hi - lo < 10) {
      setDragDay(-1);
      return;
    }

    const finalStart = lo;
    const finalEnd = hi;

    setFormDate(dragRef.current.date);
    setStartTime(`${pad(Math.floor(finalStart / 60))}:${pad(finalStart % 60)}`);
    setEndTime(`${pad(Math.floor(finalEnd / 60))}:${pad(finalEnd % 60)}`);
    // Keep drag preview visible and show popover
    setDragStartMins(finalStart);
    setDragCurrentMins(finalEnd);
    setAdding(true);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [dragging, handleDragMove, handleDragEnd]);

  // ── Resize existing blocks ──
  const [resizing, setResizing] = useState<{
    id: string;
    edge: "top" | "bottom";
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const [resizeMins, setResizeMins] = useState(0);
  const resizeRef = useRef<{
    id: string;
    edge: "top" | "bottom";
    originalStart: number;
    originalEnd: number;
  } | null>(null);

  function handleResizeStart(e: React.MouseEvent, block: TimeBlock, edge: "top" | "bottom") {
    e.stopPropagation();
    e.preventDefault();
    const info = {
      id: block.id,
      edge,
      originalStart: toMinutes(block.startTime),
      originalEnd: toMinutes(block.endTime),
    };
    resizeRef.current = info;
    dragRef.current = {
      day: new Date(block.date + "T00:00").getDay(),
      startMins: 0,
      active: false,
      date: block.date,
    };
    setResizeMins(edge === "top" ? info.originalStart : info.originalEnd);
    setResizing(info);
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return;
    const mins = yToMinutes(e.clientY);
    setResizeMins(mins);
  }, []);

  const handleResizeEnd = useCallback(
    (e: MouseEvent) => {
      const info = resizeRef.current;
      if (!info) return;
      resizeRef.current = null;
      const mins = yToMinutes(e.clientY);
      let newStart = info.originalStart;
      let newEnd = info.originalEnd;
      if (info.edge === "top") {
        newStart = Math.min(mins, info.originalEnd - 15);
      } else {
        newEnd = Math.max(mins, info.originalStart + 15);
      }
      newStart = Math.max(START_HOUR * 60, newStart);
      newEnd = Math.min(END_HOUR * 60, newEnd);
      handleUpdateBlock(info.id, {
        startTime: `${pad(Math.floor(newStart / 60))}:${pad(newStart % 60)}`,
        endTime: `${pad(Math.floor(newEnd / 60))}:${pad(newEnd % 60)}`,
      });
      setResizing(null);
    },
    [onUpdate, allBlocks, googleEvents],
  );

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  // ── Move existing blocks ──
  const [moving, setMoving] = useState<{
    id: string;
    duration: number;
    originalDate: string;
    originalStart: number;
  } | null>(null);
  const [moveMins, setMoveMins] = useState(0);
  const [moveDate, setMoveDate] = useState("");
  const moveRef = useRef<{
    id: string;
    duration: number;
    offsetMins: number;
    originalDate: string;
    originalStart: number;
  } | null>(null);

  function handleMoveStart(e: React.MouseEvent, block: TimeBlock) {
    e.stopPropagation();
    e.preventDefault();
    const startMins = toMinutes(block.startTime);
    const endMins = toMinutes(block.endTime);
    const duration = endMins - startMins;
    const dayNum = new Date(block.date + "T00:00").getDay();
    dragRef.current = {
      day: dayNum,
      startMins: 0,
      active: false,
      date: block.date,
    };
    const clickMins = yToMinutes(e.clientY);
    const offsetMins = clickMins - startMins;
    moveRef.current = {
      id: block.id,
      duration,
      offsetMins,
      originalDate: block.date,
      originalStart: startMins,
    };
    setMoveMins(startMins);
    setMoveDate(block.date);
    setMoving({
      id: block.id,
      duration,
      originalDate: block.date,
      originalStart: startMins,
    });
  }

  const handleMoveMove = useCallback((e: MouseEvent) => {
    if (!moveRef.current) return;
    // Find which column the cursor is over
    let closestDate = moveRef.current.originalDate;
    let closestDist = Infinity;
    columnRefs.current.forEach((el, dayNum) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        // Find the date for this day column from gridDates
        closestDate = el.dataset.date || closestDate;
        dragRef.current.day = dayNum;
      }
    });
    setMoveDate(closestDate);
    const mins = yToMinutes(e.clientY);
    const newStart = Math.max(
      START_HOUR * 60,
      Math.min(END_HOUR * 60 - moveRef.current.duration, mins - moveRef.current.offsetMins),
    );
    setMoveMins(snapToQuarter(newStart));
  }, []);

  const handleMoveEnd = useCallback(() => {
    const info = moveRef.current;
    if (!info) return;
    moveRef.current = null;
    const newStart = moveMins;
    const newEnd = newStart + info.duration;
    handleUpdateBlock(info.id, {
      date: moveDate,
      startTime: `${pad(Math.floor(newStart / 60))}:${pad(newStart % 60)}`,
      endTime: `${pad(Math.floor(newEnd / 60))}:${pad(newEnd % 60)}`,
    });
    setMoving(null);
  }, [moveMins, moveDate, onUpdate]);

  useEffect(() => {
    if (moving) {
      window.addEventListener("mousemove", handleMoveMove);
      window.addEventListener("mouseup", handleMoveEnd);
      return () => {
        window.removeEventListener("mousemove", handleMoveMove);
        window.removeEventListener("mouseup", handleMoveEnd);
      };
    }
  }, [moving, handleMoveMove, handleMoveEnd]);

  function handleMonthCellClick(date: Date) {
    setFormDate(toISODate(date));
    setStartTime("09:00");
    setEndTime("10:00");
    setAdding(true);
  }

  // Compute popover position relative to container
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Day todo popup state
  const [todoPopupDate, setTodoPopupDate] = useState<string | null>(null);
  const [todoInput, setTodoInput] = useState("");
  useEffect(() => {
    if (adding && ghostRef.current && containerRef.current) {
      const ghostRect = ghostRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setPopoverPos({
        top: ghostRect.top - containerRect.top,
        left: ghostRect.right - containerRect.left + 8,
      });
    } else {
      setPopoverPos(null);
    }
  }, [adding, formDate, dragStartMins, dragCurrentMins]);

  function handleAdd() {
    if (!title.trim()) return;

    if (googleConnected && selectedCalendarId) {
      // Create on Google Calendar
      const cal = googleCalendars.find((c) => c.id === selectedCalendarId);
      const eventColor = cal?.color || "#039be5";

      fetch("/api/google/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: selectedCalendarId,
          title: title.trim(),
          date: formDate,
          startTime,
          endTime,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.googleEventId) {
            setGoogleEvents((prev) => [
              ...prev,
              {
                id: `gcal-${data.googleEventId}`,
                googleEventId: data.googleEventId,
                googleCalendarId: selectedCalendarId,
                title: title.trim(),
                date: formDate,
                startTime,
                endTime,
                color: eventColor,
                source: "google",
              },
            ]);
          }
        })
        .catch((err) => console.error("Failed to create Google event:", err));
    } else {
      onAdd({ title: title.trim(), startTime, endTime, color, date: formDate });
    }
    cancelAdd();
  }

  function cancelAdd() {
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
    setColor("amber");
    setAdding(false);
    setDragDay(null);
  }

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleBlockClick(block: TimeBlock, e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimer.current) {
      // Double click — open detail popover
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      setSelectedBlock(block);
      setAdding(false);
    } else {
      // Single click — select after delay (cancelled if double-click follows)
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        if (selectedBlock?.id === block.id) {
          // Clicking already-selected block deselects
          setSelectedBlock(null);
          setDetailPos(null);
        } else {
          setSelectedBlock(block);
          setDetailPos(null); // select only, no popover
        }
      }, 250);
    }
  }

  function closeDetail() {
    setSelectedBlock(null);
    setDetailPos(null);
  }

  // Delete selected block with Delete/Backspace key, Escape to deselect
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!selectedBlock) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;
        e.preventDefault();
        handleDeleteBlock(selectedBlock.id);
        closeDetail();
      }
      if (e.key === "Escape") {
        closeDetail();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBlock]);

  // Position detail popover next to selected block
  useEffect(() => {
    if (selectedBlock && selectedBlockRef.current && containerRef.current) {
      const blockRect = selectedBlockRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setDetailPos({
        top: blockRect.top - containerRect.top,
        left: blockRect.right - containerRect.left + 8,
      });
    } else if (!selectedBlock) {
      setDetailPos(null);
    }
  }, [selectedBlock]);

  // Debounced Google Calendar sync — waits 500ms after last call before firing
  const pendingUpdates = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function syncGoogleUpdate(block: TimeBlock, updates: Partial<TimeBlock>) {
    if (block.source !== "google" || !block.googleEventId) return;
    const merged = { ...block, ...updates };

    // Clear any pending update for this event
    const existing = pendingUpdates.current.get(block.googleEventId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      pendingUpdates.current.delete(block.googleEventId!);
      fetch(`/api/google/calendar/events/${block.googleEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: block.googleCalendarId || "primary",
          date: merged.date,
          startTime: merged.startTime,
          endTime: merged.endTime,
          title: updates.title,
        }),
      }).catch((err) => console.error("Google sync error:", err));
    }, 500);

    pendingUpdates.current.set(block.googleEventId, timer);
  }

  function syncGoogleDelete(block: TimeBlock) {
    if (block.source !== "google" || !block.googleEventId) return;

    // Cancel any pending update for this event
    const existing = pendingUpdates.current.get(block.googleEventId);
    if (existing) {
      clearTimeout(existing);
      pendingUpdates.current.delete(block.googleEventId);
    }

    const calId = block.googleCalendarId || "primary";
    fetch(`/api/google/calendar/events/${block.googleEventId}?calendarId=${encodeURIComponent(calId)}`, {
      method: "DELETE",
    }).catch((err) => console.error("Google delete error:", err));
  }

  function handleUpdateBlock(id: string, updates: Partial<TimeBlock>) {
    const block = allBlocks.find((b) => b.id === id);
    if (block?.source === "google") {
      syncGoogleUpdate(block, updates);
      setGoogleEvents((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    } else {
      onUpdate(id, updates);
    }
  }

  function handleDeleteBlock(id: string) {
    const block = allBlocks.find((b) => b.id === id);
    if (block?.source === "google") {
      syncGoogleDelete(block);
      setGoogleEvents((prev) => prev.filter((b) => b.id !== id));
    } else {
      onDelete(id);
    }
  }

  // Dates shown in time grid
  const gridDates = view === "today" ? [weekDates[new Date().getDay()]] : weekDates;

  return (
    <div className="flex gap-4">
      <div ref={containerRef} className="relative flex flex-col gap-3 flex-1 min-w-0">
        {/* View toggle + month nav */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!fixedView && (
              <div className="flex gap-0.5 bg-stone-100 dark:bg-stone-800/60 rounded-lg p-0.5 w-fit">
                {(["today", "week", "month"] as CalendarView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md capitalize transition-all ${
                      view === v
                        ? "bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm"
                        : "text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    {v === "today" ? "Day" : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {!fixedView &&
              (googleConnected ? (
                <span
                  className="text-[10px] text-sky-500 dark:text-sky-400 font-medium flex items-center gap-1"
                  title="Google Calendar connected"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                  GCal
                </span>
              ) : (
                <a
                  href="/api/google/auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-stone-400 dark:text-stone-600 hover:text-sky-500 dark:hover:text-sky-400 font-medium transition-colors"
                  title="Connect Google Calendar"
                >
                  + GCal
                </a>
              ))}
          </div>

          {view === "week" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-sm"
              >
                ‹
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`text-xs font-medium px-2 py-0.5 rounded-md transition-all ${
                  weekOffset === 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-stone-500 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                }`}
              >
                {weekOffset === 0
                  ? "This Week"
                  : `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </button>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-sm"
              >
                ›
              </button>
            </div>
          )}

          {view === "month" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-sm"
              >
                ‹
              </button>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400 w-32 text-center">
                {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}
              </span>
              <button
                onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-sm"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* ── TIME GRID (Today & Week) ── */}
        {view !== "month" && (
          <>
            {/* Day headers */}
            <div className="flex">
              <div className="w-10 shrink-0" />
              {gridDates.map((date, i) => {
                const isToday = date.toDateString() === todayStr;
                const dateStr = toISODate(date);
                const dayTasks = tasks.filter((t) => t.date === dateStr);
                const pendingCount = dayTasks.filter((t) => !t.done).length;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center pb-2 select-none cursor-pointer group/day"
                    onClick={() => {
                      setTodoPopupDate(dateStr);
                      setTodoInput("");
                    }}
                    title="Click to manage to-dos for this day"
                  >
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                        isToday
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-stone-400 dark:text-stone-600 group-hover/day:text-stone-600 dark:group-hover/day:text-stone-400"
                      }`}
                    >
                      {view === "today"
                        ? date.toLocaleDateString("en-US", { weekday: "long" })
                        : date.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                    </span>
                    <span
                      className={`mt-0.5 w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isToday
                          ? "bg-amber-500 text-white"
                          : "text-stone-600 dark:text-stone-400 group-hover/day:bg-stone-100 dark:group-hover/day:bg-stone-800"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {pendingCount > 0 && (
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid */}
            <div
              ref={scrollRef}
              className="overflow-y-auto rounded-xl border border-stone-200/40 dark:border-stone-800/25"
              style={{ maxHeight: fixedView ? "360px" : "520px" }}
            >
              <div className="relative flex" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                {/* Time gutter */}
                <div className="w-10 shrink-0 relative select-none">
                  {HOURS.map((h, idx) => (
                    <div
                      key={h}
                      style={{
                        position: "absolute",
                        top: `${idx * HOUR_HEIGHT - 7}px`,
                        right: "6px",
                      }}
                    >
                      <span className="text-[9px] text-stone-400 dark:text-stone-600 font-mono tabular-nums">
                        {formatHour(h)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {gridDates.map((date, dayIdx) => {
                  const isToday = date.toDateString() === todayStr;
                  const dayBlocks = allBlocks.filter((b) => b.date === toISODate(date));
                  const isDragTarget = dragDay === date.getDay() && (!adding || formDate === toISODate(date));
                  const dragLo = Math.min(dragStartMins, dragCurrentMins);
                  const dragHi = Math.max(dragStartMins, dragCurrentMins);
                  const dragTop = ((dragLo - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const dragHeight = Math.max(((dragHi - dragLo) / 60) * HOUR_HEIGHT, HOUR_HEIGHT / 4);

                  return (
                    <div
                      key={dayIdx}
                      ref={(el) => {
                        if (el) {
                          columnRefs.current.set(date.getDay(), el);
                          el.dataset.date = toISODate(date);
                        }
                      }}
                      onMouseDown={(e) => handleDragStart(e, date)}
                      onDoubleClick={(e) => handleDoubleClick(e, date)}
                      className={`flex-1 relative border-l cursor-crosshair select-none transition-colors ${
                        isToday
                          ? "border-stone-200/40 dark:border-stone-700/30 bg-amber-500/[0.025] dark:bg-amber-500/[0.04]"
                          : "border-stone-100/60 dark:border-stone-800/20 hover:bg-stone-50/50 dark:hover:bg-stone-800/10"
                      }`}
                    >
                      {/* Hour lines */}
                      {HOURS.map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            top: `${idx * HOUR_HEIGHT}px`,
                            left: 0,
                            right: 0,
                            height: `${HOUR_HEIGHT}px`,
                          }}
                          className="border-b border-stone-200/30 dark:border-stone-700/20"
                        />
                      ))}
                      {/* Half-hour lines */}
                      {HOURS.map((_, idx) => (
                        <div
                          key={`h${idx}`}
                          style={{
                            position: "absolute",
                            top: `${idx * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`,
                            left: 0,
                            right: 0,
                            height: "1px",
                          }}
                          className="bg-stone-200/60 dark:bg-stone-700/30"
                        />
                      ))}

                      {/* Now indicator */}
                      {isToday && showNow && (
                        <div
                          style={{
                            position: "absolute",
                            top: `${nowTop}px`,
                            left: 0,
                            right: 0,
                            zIndex: 10,
                          }}
                          className="pointer-events-none"
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-amber-500 -ml-1 shrink-0" />
                            <div className="flex-1 h-px bg-amber-500/70" />
                          </div>
                        </div>
                      )}

                      {/* Blocks */}
                      {dayBlocks.map((block) => {
                        const isGoogle = block.source === "google";
                        const isMoving = moving?.id === block.id;
                        const isMovedHere = isMoving && moveDate === toISODate(date);
                        const isMovedAway = isMoving && moveDate !== toISODate(date);
                        const isResizing = resizing?.id === block.id;
                        let startMins = toMinutes(block.startTime);
                        let endMins = toMinutes(block.endTime);
                        if (isResizing) {
                          if (resizing.edge === "top") {
                            startMins = Math.min(resizeMins, resizing.originalEnd - 15);
                          } else {
                            endMins = Math.max(resizeMins, resizing.originalStart + 15);
                          }
                        }
                        if (isMovedHere) {
                          startMins = moveMins;
                          endMins = moveMins + moving.duration;
                        }
                        const top = ((startMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                        const height = Math.max(18, ((endMins - startMins) / 60) * HOUR_HEIGHT);
                        // Hide the block in its original column if it's been moved to another day
                        if (isMovedAway) return null;
                        const isSelected = selectedBlock?.id === block.id;
                        return (
                          <div
                            key={block.id}
                            ref={isSelected ? selectedBlockRef : undefined}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => handleBlockClick(block, e)}
                            style={{
                              position: "absolute",
                              top,
                              height,
                              left: 2,
                              right: 2,
                              zIndex: isSelected ? 25 : isResizing || isMoving ? 20 : 5,
                              ...hexColorStyle(block.color),
                            }}
                            className={`group rounded-md px-1.5 py-0.5 overflow-hidden ${colorClasses(block.color)} ${isResizing || isMoving ? "ring-2 ring-amber-500/50 shadow-lg" : ""} ${isMoving ? "opacity-90" : ""} ${isSelected ? "ring-2 ring-amber-500/60" : ""}`}
                          >
                            {/* Top resize handle */}
                            <div
                              onMouseDown={(e) => handleResizeStart(e, block, "top")}
                              className="absolute top-0 left-0 right-0 h-2 cursor-n-resize z-10 opacity-0 group-hover:opacity-100 hover:!opacity-100"
                            >
                              <div className="mx-auto mt-0.5 w-6 h-0.5 rounded-full bg-current opacity-40" />
                            </div>
                            {/* Move handle — block body */}
                            <div
                              onMouseDown={(e) => handleMoveStart(e, block)}
                              className="cursor-grab active:cursor-grabbing mt-1"
                            >
                              <div className="text-[11px] font-semibold truncate leading-snug">
                                {isGoogle && (
                                  <span className="opacity-50 mr-0.5" title="Google Calendar">
                                    G
                                  </span>
                                )}
                                {block.title}
                              </div>
                              {height > 28 && (
                                <div className="text-[10px] opacity-60 font-mono leading-none mt-0.5">
                                  {formatTime(`${pad(Math.floor(startMins / 60))}:${pad(startMins % 60)}`)}
                                  {(isResizing || isMoving) &&
                                    ` – ${formatTime(`${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`)}`}
                                </div>
                              )}
                            </div>
                            {/* Bottom resize handle */}
                            <div
                              onMouseDown={(e) => handleResizeStart(e, block, "bottom")}
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-10 opacity-0 group-hover:opacity-100 hover:!opacity-100"
                            >
                              <div className="mx-auto mb-0.5 w-6 h-0.5 rounded-full bg-current opacity-40" />
                            </div>
                          </div>
                        );
                      })}

                      {/* Moving block ghost in target column */}
                      {moving &&
                        moveDate === toISODate(date) &&
                        !dayBlocks.some((b) => b.id === moving.id) &&
                        (() => {
                          const movedBlock = allBlocks.find((b) => b.id === moving.id);
                          if (!movedBlock) return null;
                          const mTop = ((moveMins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                          const mHeight = Math.max(18, (moving.duration / 60) * HOUR_HEIGHT);
                          return (
                            <div
                              style={{
                                position: "absolute",
                                top: mTop,
                                height: mHeight,
                                left: 2,
                                right: 2,
                                zIndex: 20,
                                ...hexColorStyle(movedBlock.color),
                              }}
                              className={`rounded-md px-1.5 py-0.5 overflow-hidden ring-2 ring-amber-500/50 shadow-lg opacity-90 ${colorClasses(movedBlock.color)}`}
                            >
                              <div className="text-[11px] font-semibold truncate leading-snug mt-1">
                                {movedBlock.title}
                              </div>
                              <div className="text-[10px] opacity-60 font-mono leading-none mt-0.5">
                                {formatTime(`${pad(Math.floor(moveMins / 60))}:${pad(moveMins % 60)}`)}
                                {" – "}
                                {formatTime(
                                  `${pad(Math.floor((moveMins + moving.duration) / 60))}:${pad((moveMins + moving.duration) % 60)}`,
                                )}
                              </div>
                            </div>
                          );
                        })()}

                      {/* Drag preview / ghost block */}
                      {isDragTarget && (dragging || adding) && (
                        <div
                          ref={adding ? ghostRef : undefined}
                          style={{
                            position: "absolute",
                            top: dragTop,
                            height: dragHeight,
                            left: 2,
                            right: 2,
                            zIndex: 20,
                          }}
                          className={`rounded-md border ${adding ? colorClasses(color) : "bg-amber-500/30 border-amber-500/60"} ${adding ? "" : "pointer-events-none"}`}
                        >
                          <div className="text-[10px] font-mono px-1.5 py-0.5 opacity-70">
                            {formatTime(`${pad(Math.floor(dragLo / 60))}:${pad(dragLo % 60)}`)}
                            {" – "}
                            {formatTime(`${pad(Math.floor(dragHi / 60))}:${pad(dragHi % 60)}`)}
                          </div>
                          {adding && title && <div className="text-[11px] font-semibold px-1.5 truncate">{title}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── MONTH GRID ── */}
        {view === "month" && (
          <div className="rounded-xl border border-stone-200/40 dark:border-stone-800/25 overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b border-stone-200/40 dark:border-stone-800/25 bg-stone-50/50 dark:bg-stone-900/20">
              {DAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {getMonthCells(monthDate).map((date, i) => {
                if (!date) {
                  return (
                    <div
                      key={i}
                      className="h-24 border-b border-r border-stone-100/50 dark:border-stone-800/15 bg-stone-50/20 dark:bg-stone-900/10"
                    />
                  );
                }
                const isToday = date.toDateString() === todayStr;
                const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                const dateStr = toISODate(date);
                const dayBlocks = allBlocks.filter((b) => b.date === dateStr);
                const monthDayTasks = tasks.filter((t) => t.date === dateStr);
                const monthPendingCount = monthDayTasks.filter((t) => !t.done).length;

                return (
                  <div
                    key={i}
                    onClick={() => handleMonthCellClick(date)}
                    className={`h-24 p-1.5 border-b border-r border-stone-100/50 dark:border-stone-800/15 cursor-pointer transition-colors flex flex-col ${
                      isToday ? "bg-amber-50/70 dark:bg-amber-900/10" : "hover:bg-stone-50 dark:hover:bg-stone-800/20"
                    } ${!isCurrentMonth ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${
                          isToday ? "bg-amber-500 text-white" : "text-stone-600 dark:text-stone-400"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {monthPendingCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTodoPopupDate(dateStr);
                            setTodoInput("");
                          }}
                          className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                          title={`${monthPendingCount} to-do${monthPendingCount > 1 ? "s" : ""}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500" />
                          {monthPendingCount}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayBlocks.slice(0, 2).map((block) => (
                        <div
                          key={block.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBlock(block.id);
                          }}
                          className={`text-[10px] px-1 py-px rounded truncate leading-snug ${colorClasses(block.color)}`}
                          style={hexColorStyle(block.color)}
                          title={`${block.title} — click to remove`}
                        >
                          {block.source === "google" && <span className="opacity-50 mr-0.5">G</span>}
                          {block.title}
                        </div>
                      ))}
                      {dayBlocks.length > 2 && (
                        <div className="text-[10px] text-stone-400 dark:text-stone-600 px-1">
                          +{dayBlocks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick add hint */}
        {!adding && (
          <p className="text-xs text-stone-400 dark:text-stone-600">Drag on the calendar to create a block</p>
        )}

        {/* Popover for new block */}
        {adding && popoverPos && (
          <div
            style={{
              position: "absolute",
              top: popoverPos.top,
              left: popoverPos.left,
              zIndex: 50,
            }}
            className="w-56 rounded-xl border border-stone-200/50 dark:border-stone-700/30 bg-white dark:bg-stone-900 shadow-xl p-3 flex flex-col gap-2.5"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={(el) => {
                if (el) requestAnimationFrame(() => el.focus());
              }}
              placeholder="New Event"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") cancelAdd();
              }}
              className="bg-transparent text-sm font-semibold text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 outline-none w-full"
            />
            <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              {new Date(formDate + "T00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {"  "}
              {formatTime(startTime)} to {formatTime(endTime)}
            </div>
            {googleConnected && googleCalendars.length > 0 ? (
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full text-[11px] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md px-2 py-1.5 border border-stone-200/40 dark:border-stone-700/30 outline-none"
              >
                {googleCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1.5">
                {BLOCK_COLORS.filter((c) => c.value !== "sky").map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${SWATCH_BG[c.value]} ${
                      color === c.value
                        ? "scale-125 border-stone-600 dark:border-white/60 opacity-100"
                        : "border-transparent opacity-40 hover:opacity-70"
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-100/50 dark:border-stone-800/30">
              <button
                onClick={cancelAdd}
                className="flex-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!title.trim()}
                className="flex-1 text-xs font-semibold py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Detail popover for existing block */}
        {selectedBlock && detailPos && (
          <div
            style={{
              position: "absolute",
              top: detailPos.top,
              left: detailPos.left,
              zIndex: 50,
            }}
            className="w-56 rounded-xl border border-stone-200/50 dark:border-stone-700/30 bg-white dark:bg-stone-900 shadow-xl p-3 flex flex-col gap-2.5"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200 leading-snug">
                {selectedBlock.source === "google" && <span className="text-sky-500 mr-1 text-xs">G</span>}
                {selectedBlock.title}
              </div>
              <button
                onClick={closeDetail}
                className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors leading-none mt-0.5 shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              {new Date(selectedBlock.date + "T00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {"  "}
              {formatTime(selectedBlock.startTime)} – {formatTime(selectedBlock.endTime)}
            </div>
            {googleConnected && googleCalendars.length > 0 && (
              <select
                value={selectedBlock.googleCalendarId || ""}
                onChange={(e) => {
                  const newCalId = e.target.value;
                  const newCal = googleCalendars.find((c) => c.id === newCalId);
                  if (!newCalId || !newCal) return;

                  if (selectedBlock.source === "google" && selectedBlock.googleEventId) {
                    // Move event between Google calendars
                    fetch(`/api/google/calendar/events/${selectedBlock.googleEventId}/move`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        fromCalendarId: selectedBlock.googleCalendarId || "primary",
                        toCalendarId: newCalId,
                      }),
                    }).catch((err) => console.error("Calendar move error:", err));
                  }

                  // Update local state
                  const updates = {
                    googleCalendarId: newCalId,
                    color: newCal.color,
                  };
                  if (selectedBlock.source === "google") {
                    setGoogleEvents((prev) => prev.map((b) => (b.id === selectedBlock.id ? { ...b, ...updates } : b)));
                  } else {
                    onUpdate(selectedBlock.id, updates);
                  }
                  setSelectedBlock({ ...selectedBlock, ...updates });
                }}
                className="w-full text-[11px] bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md px-2 py-1.5 border border-stone-200/40 dark:border-stone-700/30 outline-none"
              >
                {!selectedBlock.googleCalendarId && <option value="">Local event</option>}
                {googleCalendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-100/50 dark:border-stone-800/30">
              <button
                onClick={closeDetail}
                className="flex-1 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-colors py-1"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDeleteBlock(selectedBlock.id);
                  closeDetail();
                }}
                className="flex-1 text-xs font-semibold py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Day todo popup */}
      {todoPopupDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setTodoPopupDate(null)}>
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
          <div
            className="relative w-80 max-h-[420px] rounded-2xl border border-stone-200/50 dark:border-stone-700/30 bg-white dark:bg-stone-900 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100/50 dark:border-stone-800/30">
              <div>
                <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {new Date(todoPopupDate + "T00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <p className="text-[10px] text-stone-400 dark:text-stone-600">To-dos for this day</p>
              </div>
              <button
                onClick={() => setTodoPopupDate(null)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5">
              {(() => {
                const dayTasks = tasks.filter((t) => t.date === todoPopupDate);
                const pending = dayTasks.filter((t) => !t.done);
                const done = dayTasks.filter((t) => t.done);

                if (dayTasks.length === 0) {
                  return (
                    <p className="text-sm text-stone-400 dark:text-stone-600 italic py-2">
                      No to-dos yet. Add one below.
                    </p>
                  );
                }

                return (
                  <>
                    {pending.map((task) => (
                      <div key={task.id} className="group flex items-center gap-2.5">
                        <button
                          onClick={() => onToggleTask?.(task.id)}
                          className="w-4 h-4 rounded border border-stone-300/60 dark:border-stone-600/50 hover:border-amber-400/70 dark:hover:border-amber-400/60 shrink-0 transition-colors flex items-center justify-center"
                        />
                        <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 leading-snug">
                          {task.text}
                        </span>
                        <button
                          onClick={() => onDeleteTask?.(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-600 hover:text-rose-400 transition-all text-xs shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {done.length > 0 && pending.length > 0 && (
                      <div className="border-t border-stone-200/40 dark:border-stone-800/30 my-1" />
                    )}
                    {done.map((task) => (
                      <div key={task.id} className="group flex items-center gap-2.5">
                        <button
                          onClick={() => onToggleTask?.(task.id)}
                          className="w-4 h-4 rounded border border-stone-200/50 dark:border-stone-700/40 bg-stone-100 dark:bg-stone-800 shrink-0 transition-colors flex items-center justify-center"
                        >
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path
                              d="M1 3l2 2 4-4"
                              stroke="#a8a29e"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <span className="flex-1 text-sm text-stone-400 dark:text-stone-600 line-through leading-snug">
                          {task.text}
                        </span>
                        <button
                          onClick={() => onDeleteTask?.(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 dark:text-stone-700 hover:text-rose-400 transition-all text-xs shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* Add task input */}
            <div className="px-4 py-3 border-t border-stone-100/50 dark:border-stone-800/30">
              <div className="flex items-center gap-2 rounded-xl border border-stone-200/40 dark:border-stone-800/30 bg-stone-50 dark:bg-stone-900/30 px-3 py-2 focus-within:border-stone-300/60 dark:focus-within:border-stone-700/40 transition-colors">
                <input
                  autoFocus
                  placeholder="Add a to-do..."
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && todoInput.trim()) {
                      onAddTask?.(todoInput.trim(), todoPopupDate);
                      setTodoInput("");
                    }
                  }}
                  className="flex-1 bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none"
                />
                {todoInput.trim() && (
                  <button
                    onClick={() => {
                      onAddTask?.(todoInput.trim(), todoPopupDate);
                      setTodoInput("");
                    }}
                    className="text-xs text-amber-500 dark:text-amber-400 font-medium shrink-0 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar sidebar */}
      {googleConnected && googleCalendars.length > 0 && !fixedView && (
        <div
          className={`shrink-0 flex flex-col gap-1 pt-10 transition-all duration-200 ${sidebarCollapsed ? "w-6" : "w-36"}`}
        >
          <button
            onClick={() => setSidebarCollapsed((p) => !p)}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600 mb-1 hover:text-stone-500 dark:hover:text-stone-500 transition-colors"
            title={sidebarCollapsed ? "Show calendars" : "Hide calendars"}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={`shrink-0 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
            >
              <path
                d="M7 2L4 5l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!sidebarCollapsed && <span>Calendars</span>}
          </button>
          {!sidebarCollapsed &&
            googleCalendars.map((cal) => {
              const hidden = hiddenCalendars.has(cal.id);
              return (
                <button
                  key={cal.id}
                  onClick={() =>
                    setHiddenCalendars((prev) => {
                      const next = new Set(prev);
                      if (next.has(cal.id)) next.delete(cal.id);
                      else next.add(cal.id);
                      return next;
                    })
                  }
                  className={`flex items-center gap-2 text-[11px] py-1 px-1.5 rounded-md transition-all text-left ${
                    hidden ? "opacity-30 hover:opacity-50" : "opacity-100 hover:bg-stone-100 dark:hover:bg-stone-800/40"
                  }`}
                  title={hidden ? `Show ${cal.name}` : `Hide ${cal.name}`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cal.color }} />
                  <span className="text-stone-600 dark:text-stone-400 truncate">{cal.name}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
