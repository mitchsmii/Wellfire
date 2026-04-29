import { useEffect, useRef, useState } from "react";

interface Props {
  intention: string;
  onSave: (text: string) => void;
}

export default function IntentionBar({ intention, onSave }: Props) {
  const [editing, setEditing] = useState(!intention);
  const [draft, setDraft] = useState(intention);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(intention);
    if (!intention) setEditing(true);
  }, [intention]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const text = draft.trim();
    if (!text) {
      setDraft(intention);
      if (intention) setEditing(false);
      return;
    }
    onSave(text);
    setEditing(false);
  }

  return (
    <div className="border-b border-amber-200/30 dark:border-amber-900/15 bg-amber-50/70 dark:bg-amber-950/20 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-3">
        <span className="font-serif-q text-2xl leading-none text-amber-500 dark:text-amber-400/80 select-none shrink-0">
          “
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 shrink-0">
          Intention
        </span>
        {editing ? (
          <input
            ref={inputRef}
            placeholder="What do you intend to bring to today?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(intention);
                if (intention) setEditing(false);
              }
            }}
            className="flex-1 bg-transparent font-serif-q italic text-base font-medium text-stone-900 dark:text-stone-50 placeholder-stone-500 dark:placeholder-stone-500 outline-none leading-snug"
          />
        ) : (
          <p
            onClick={() => {
              setDraft(intention);
              setEditing(true);
            }}
            className="flex-1 font-serif-q italic text-base font-medium text-stone-900 dark:text-stone-50 leading-snug cursor-text truncate"
            title="Click to edit"
          >
            {intention}
          </p>
        )}
      </div>
    </div>
  );
}
