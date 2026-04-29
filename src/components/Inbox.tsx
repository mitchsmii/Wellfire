import { useState } from "react";
import type { Task } from "../types";

interface Props {
  tasks: Task[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}

export default function Inbox({ tasks, onAdd, onDelete }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [input, setInput] = useState("");
  const pending = tasks.filter((t) => !t.done);

  function handleAdd() {
    const text = input.trim();
    if (!text) {
      setCapturing(false);
      return;
    }
    onAdd(text);
    setInput("");
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-stone-500 dark:text-stone-400">
            Inbox
          </div>
          <div className="text-xs text-stone-400 dark:text-stone-600">
            Unsorted · drag to a day
          </div>
        </div>
        <span className="text-[10px] text-stone-400 dark:text-stone-600 tabular-nums">
          {pending.length} unsorted
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-stone-400 dark:text-stone-600 italic">
          Nothing in your inbox — capture a thought below.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pending.map((task) => (
            <li
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 border border-dashed border-stone-200/60 dark:border-stone-800/60 text-sm text-stone-600 dark:text-stone-300 cursor-grab active:cursor-grabbing hover:border-amber-400/60 transition-colors"
            >
              <span className="text-stone-300 dark:text-stone-700 select-none">⋮⋮</span>
              <span className="flex-1 truncate">{task.text}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-600 hover:text-rose-400 transition-all text-xs shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {capturing ? (
        <input
          autoFocus
          placeholder="What's on your mind?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") {
              setInput("");
              setCapturing(false);
            }
          }}
          className="mt-1 w-full bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400/80 dark:placeholder-stone-600 outline-none px-2 py-1.5 rounded-lg border border-dashed border-amber-400/60 focus:border-amber-500/80 transition-colors"
        />
      ) : (
        <button
          onClick={() => setCapturing(true)}
          className="text-xs text-stone-400 dark:text-stone-600 hover:text-amber-500 text-left mt-1 transition-colors"
        >
          + Capture a thought
        </button>
      )}
    </div>
  );
}
