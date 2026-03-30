export interface Goal {
  id: string;
  text: string;
  category: 'weekly' | 'monthly' | 'big-picture';
  createdAt: number;
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
  date: string; // ISO date string, e.g. "2026-03-21"
  source?: 'local' | 'google';
  googleEventId?: string;
  googleCalendarId?: string;
}

export interface GoogleCalendar {
  id: string;
  name: string;
  color: string; // hex color from Google, e.g. "#039be5"
  primary?: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  date?: string; // ISO date string, e.g. "2026-03-21" — undefined means today's general to-do
}
