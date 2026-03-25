import { useState } from 'react';
import type { Goal } from '../types';

interface Props {
  goals: Goal[];
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: { value: Goal['category']; label: string; color: string }[] = [
  { value: 'weekly', label: 'This Week', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'monthly', label: 'This Month', color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'big-picture', label: 'Big Picture', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
];

export default function Goals({ goals, onAdd, onEdit, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<Goal['category']>('weekly');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function handleAdd() {
    if (!newText.trim()) return;
    onAdd({ text: newText.trim(), category: newCategory });
    setNewText('');
    setNewCategory('weekly');
    setAdding(false);
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditText(goal.text);
  }

  function commitEdit(id: string) {
    if (editText.trim()) onEdit(id, editText.trim());
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {CATEGORIES.map((cat) => {
        const items = goals.filter((g) => g.category === cat.value);
        if (items.length === 0) return null;
        return (
          <div key={cat.value}>
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-2.5 ${cat.color}`}
            >
              {cat.label}
            </span>
            <ul className="flex flex-col gap-1.5">
              {items.map((goal) => (
                <li key={goal.id} className="group flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600 shrink-0" />
                  {editingId === goal.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitEdit(goal.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(goal.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-transparent text-sm text-stone-800 dark:text-stone-100 outline-none border-b border-stone-300 dark:border-stone-600 focus:border-amber-500 pb-0.5 transition-colors"
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm text-stone-600 dark:text-stone-300 leading-snug cursor-text"
                      onClick={() => startEdit(goal)}
                    >
                      {goal.text}
                    </span>
                  )}
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-600 hover:text-rose-400 transition-all text-xs shrink-0 mt-0.5"
                    title="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {goals.length === 0 && !adding && (
        <p className="text-sm text-stone-400 dark:text-stone-600 italic">No goals yet. What are you working toward?</p>
      )}

      {adding ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-900/40 p-3 flex flex-col gap-3">
          <textarea
            autoFocus
            placeholder="Write your goal..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); }
              if (e.key === 'Escape') { setAdding(false); setNewText(''); }
            }}
            className="bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none resize-none leading-relaxed min-h-[56px]"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setNewCategory(cat.value)}
                className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all ${
                  newCategory === cat.value
                    ? cat.color
                    : 'text-stone-400 dark:text-stone-600 border-stone-300 dark:border-stone-700 bg-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => { setAdding(false); setNewText(''); }}
              className="text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-stone-400 dark:text-stone-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors group w-fit"
        >
          <span className="text-lg leading-none">+</span>
          Add goal
        </button>
      )}
    </div>
  );
}
