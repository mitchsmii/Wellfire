import { useState } from 'react';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TodoList({ tasks, onAdd, onToggle, onDelete }: Props) {
  const [input, setInput] = useState('');

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput('');
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.length === 0 && (
        <p className="text-sm text-stone-400 dark:text-stone-600 italic">Nothing on the list yet. What needs doing?</p>
      )}

      {pending.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pending.map((task) => (
            <li key={task.id} className="group flex items-center gap-2.5">
              <button
                onClick={() => onToggle(task.id)}
                className="w-4 h-4 rounded border border-stone-300/60 dark:border-stone-600/50 hover:border-amber-400/70 dark:hover:border-amber-400/60 shrink-0 transition-colors flex items-center justify-center"
                title="Complete"
              />
              <span className="flex-1 text-sm text-stone-700 dark:text-stone-200 leading-snug">{task.text}</span>
              <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-600 hover:text-rose-400 transition-all text-xs shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          {pending.length > 0 && <div className="border-t border-stone-200/40 dark:border-stone-800/30 my-0.5" />}
          <ul className="flex flex-col gap-1.5">
            {done.map((task) => (
              <li key={task.id} className="group flex items-center gap-2.5">
                <button
                  onClick={() => onToggle(task.id)}
                  className="w-4 h-4 rounded border border-stone-200/50 dark:border-stone-700/40 bg-stone-100 dark:bg-stone-800 shrink-0 transition-colors flex items-center justify-center"
                  title="Undo"
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
                <span className="flex-1 text-sm text-stone-400 dark:text-stone-600 line-through leading-snug">{task.text}</span>
                <button
                  onClick={() => onDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-stone-300 dark:text-stone-700 hover:text-rose-400 transition-all text-xs shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-stone-200/40 dark:border-stone-800/30 bg-stone-50 dark:bg-stone-900/30 px-3 py-2 focus-within:border-stone-300/60 dark:focus-within:border-stone-700/40 transition-colors">
          <input
            placeholder="Add a task..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            className="flex-1 bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none"
          />
          {input.trim() && (
            <button
              onClick={handleAdd}
              className="text-xs text-amber-500 dark:text-amber-400 font-medium shrink-0 hover:text-amber-600 dark:hover:text-amber-300 transition-colors"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {tasks.length > 0 && (
        <p className="text-[11px] text-stone-400 dark:text-stone-700">
          {pending.length === 0
            ? 'All done — great work.'
            : `${done.length} of ${tasks.length} done`}
        </p>
      )}
    </div>
  );
}
