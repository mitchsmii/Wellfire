import type { Goal, TimeBlock, Task } from "../types";

// DB row types (snake_case, matching Supabase schema)

export interface DbGoal {
  id: string;
  user_id: string;
  text: string;
  category: "weekly" | "monthly" | "big-picture";
  created_at: string;
}

export interface DbTimeBlock {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  color: string | null;
  date: string;
  source: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
}

export interface DbTask {
  id: string;
  user_id: string;
  text: string;
  done: boolean;
  created_at: string;
  date: string | null;
}

// Mappers: DB rows → app types

export function dbGoalToGoal(row: DbGoal): Goal {
  return {
    id: row.id,
    text: row.text,
    category: row.category,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function dbTimeBlockToTimeBlock(row: DbTimeBlock): TimeBlock {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color ?? undefined,
    date: row.date,
    source: (row.source as "local" | "google") ?? undefined,
    googleEventId: row.google_event_id ?? undefined,
    googleCalendarId: row.google_calendar_id ?? undefined,
  };
}

export function dbTaskToTask(row: DbTask): Task {
  return {
    id: row.id,
    text: row.text,
    done: row.done,
    createdAt: new Date(row.created_at).getTime(),
    date: row.date ?? undefined,
  };
}
