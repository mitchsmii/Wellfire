import { useState } from "react";

interface IntentionBlockProps {
  savedText: string;
  onSave: (text: string) => void;
}

export default function IntentionBlock({ savedText, onSave }: IntentionBlockProps) {
  const [intention, setIntention] = useState(savedText);
  const [saved, setSaved] = useState(savedText !== "");

  function handleSave() {
    const text = intention.trim();
    if (!text) return;
    onSave(text);
    setSaved(true);
  }

  return (
    <div className="flex items-start gap-5">
      <span className="text-4xl leading-none text-amber-400/70 dark:text-amber-500/50 select-none font-serif mt-0.5">
        "
      </span>
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/70 dark:text-amber-500/50">
          Today's Intention
        </span>
        {saved ? (
          <div className="flex items-baseline gap-3 group">
            <p className="flex-1 text-stone-700 dark:text-stone-200 text-base leading-snug italic">{savedText}</p>
            <button
              onClick={() => {
                setSaved(false);
                setIntention(savedText);
              }}
              className="opacity-0 group-hover:opacity-100 text-xs text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-all shrink-0"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              autoFocus={false}
              placeholder="What do you intend to bring to today?"
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="flex-1 bg-transparent text-base text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none"
            />
            {intention.trim() && (
              <button
                onClick={handleSave}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
              >
                Set
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
