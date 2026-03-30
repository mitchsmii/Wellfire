import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { dbGoalToGoal, dbTimeBlockToTimeBlock, dbTaskToTask } from '../lib/database.types';
import type { Goal, TimeBlock, Task } from '../types';

interface DataContextType {
  goals: Goal[];
  blocks: TimeBlock[];
  tasks: Task[];
  loading: boolean;
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void;
  editGoal: (id: string, text: string) => void;
  deleteGoal: (id: string) => void;
  addBlock: (b: Omit<TimeBlock, 'id'>) => void;
  updateBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteBlock: (id: string) => void;
  addTask: (text: string, date?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const [goalsRes, blocksRes, tasksRes] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', user!.id),
        supabase.from('time_blocks').select('*').eq('user_id', user!.id),
        supabase.from('tasks').select('*').eq('user_id', user!.id),
      ]);

      if (goalsRes.data) setGoals(goalsRes.data.map(dbGoalToGoal));
      if (blocksRes.data) setBlocks(blocksRes.data.map(dbTimeBlockToTimeBlock));
      if (tasksRes.data) setTasks(tasksRes.data.map(dbTaskToTask));
      setLoading(false);
    }

    fetchAll();
  }, [user]);

  // ── Goals ──

  const addGoal = useCallback(async (g: Omit<Goal, 'id' | 'createdAt'>) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const optimistic: Goal = { ...g, id: tempId, createdAt: Date.now() };
    setGoals((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('goals')
      .insert({ text: g.text, category: g.category, user_id: user.id })
      .select()
      .single();

    if (error) {
      setGoals((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    setGoals((prev) => prev.map((x) => (x.id === tempId ? dbGoalToGoal(data) : x)));
  }, [user]);

  const editGoal = useCallback(async (id: string, text: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, text } : g)));
    const { error } = await supabase.from('goals').update({ text }).eq('id', id);
    if (error) {
      // Refetch on error
      const { data } = await supabase.from('goals').select('*').eq('id', id).single();
      if (data) setGoals((prev) => prev.map((g) => (g.id === id ? dbGoalToGoal(data) : g)));
    }
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    const prev = goals;
    setGoals((p) => p.filter((g) => g.id !== id));
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) setGoals(prev);
  }, [goals]);

  // ── Time Blocks ──

  const addBlock = useCallback(async (b: Omit<TimeBlock, 'id'>) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const optimistic: TimeBlock = { ...b, id: tempId };
    setBlocks((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('time_blocks')
      .insert({
        title: b.title,
        start_time: b.startTime,
        end_time: b.endTime,
        color: b.color ?? null,
        date: b.date,
        source: b.source ?? 'local',
        google_event_id: b.googleEventId ?? null,
        google_calendar_id: b.googleCalendarId ?? null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      setBlocks((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    setBlocks((prev) => prev.map((x) => (x.id === tempId ? dbTimeBlockToTimeBlock(data) : x)));
  }, [user]);

  const updateBlock = useCallback(async (id: string, updates: Partial<TimeBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));

    // Map camelCase to snake_case for DB
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.googleEventId !== undefined) dbUpdates.google_event_id = updates.googleEventId;
    if (updates.googleCalendarId !== undefined) dbUpdates.google_calendar_id = updates.googleCalendarId;

    const { error } = await supabase.from('time_blocks').update(dbUpdates).eq('id', id);
    if (error) {
      const { data } = await supabase.from('time_blocks').select('*').eq('id', id).single();
      if (data) setBlocks((prev) => prev.map((b) => (b.id === id ? dbTimeBlockToTimeBlock(data) : b)));
    }
  }, []);

  const deleteBlock = useCallback(async (id: string) => {
    const prev = blocks;
    setBlocks((p) => p.filter((b) => b.id !== id));
    const { error } = await supabase.from('time_blocks').delete().eq('id', id);
    if (error) setBlocks(prev);
  }, [blocks]);

  // ── Tasks ──

  const addTask = useCallback(async (text: string, date?: string) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const optimistic: Task = { id: tempId, text, done: false, createdAt: Date.now(), date };
    setTasks((prev) => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('tasks')
      .insert({ text, done: false, date: date ?? null, user_id: user.id })
      .select()
      .single();

    if (error) {
      setTasks((prev) => prev.filter((x) => x.id !== tempId));
      return;
    }
    setTasks((prev) => prev.map((x) => (x.id === tempId ? dbTaskToTask(data) : x)));
  }, [user]);

  const toggleTask = useCallback(async (id: string) => {
    let newDone = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          newDone = !t.done;
          return { ...t, done: newDone };
        }
        return t;
      })
    );

    const { error } = await supabase.from('tasks').update({ done: newDone }).eq('id', id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !newDone } : t)));
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setTasks(prev);
  }, [tasks]);

  return (
    <DataContext.Provider value={{
      goals, blocks, tasks, loading,
      addGoal, editGoal, deleteGoal,
      addBlock, updateBlock, deleteBlock,
      addTask, toggleTask, deleteTask,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
