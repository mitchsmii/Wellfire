import { useState, useRef, useEffect } from "react";
import type { Goal, Task, TimeBlock } from "../types";

interface MessageParam {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  goals: Goal[];
  tasks: Task[];
  blocks: TimeBlock[];
  intention: string;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${period}`;
}

function buildSystemPrompt(
  goals: Goal[],
  tasks: Task[],
  blocks: TimeBlock[],
  intention: string,
): string {
  const goalsText =
    goals.length === 0
      ? "  (none set)"
      : [
          ...goals
            .filter((g) => g.category === "big-picture")
            .map((g) => `  Big picture: ${g.text}`),
          ...goals
            .filter((g) => g.category === "monthly")
            .map((g) => `  This month: ${g.text}`),
          ...goals
            .filter((g) => g.category === "weekly")
            .map((g) => `  This week: ${g.text}`),
        ].join("\n");

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const pendingText = pending.length
    ? pending.map((t) => `  • ${t.text}`).join("\n")
    : "  (none)";
  const doneText = done.length
    ? done.map((t) => `  • ${t.text}`).join("\n")
    : "  (none)";

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const datedBlocks = blocks.filter((b) => b.date);

  const todayBlocks = datedBlocks
    .filter((b) => b.date === todayISO)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayScheduleText = todayBlocks.length
    ? todayBlocks
        .map((b) => `  ${formatTime12(b.startTime)}–${formatTime12(b.endTime)}: ${b.title}`)
        .join("\n")
    : "  (nothing scheduled)";

  const weekBlocks = datedBlocks
    .filter((b) => b.date !== todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const weekScheduleText = weekBlocks.length
    ? weekBlocks
        .map((b) => {
          const d = new Date(b.date + 'T00:00');
          return `  ${DAY_LABELS[d.getDay()]} ${formatTime12(b.startTime)}–${formatTime12(b.endTime)}: ${b.title}`;
        })
        .join("\n")
    : "  (nothing else scheduled)";

  return `You are a grounding morning companion inside Wellfire, the user's personal daily dashboard. Today is ${today}.

You have full context on where they are right now:

TODAY'S INTENTION:
"${intention || "not set yet"}"

GOALS:
${goalsText}

TODAY'S SCHEDULE:
${todayScheduleText}

REST OF THE WEEK:
${weekScheduleText}

TODAY'S TO-DO (pending):
${pendingText}

ALREADY DONE TODAY:
${doneText}

YOUR JOB:
You are an alignment coach. Your primary role is to cross-reference their schedule, to-do list, and goals — then surface gaps, conflicts, and opportunities. Specifically:
- Identify to-do items that have NO time blocked in the schedule. Call these out and suggest when they could fit.
- Identify schedule blocks that don't connect to any goal or to-do. Ask if they're still needed or if that time could serve their goals better.
- Look for goals that have no tasks or schedule time supporting them. Flag these as at risk of drifting.
- Notice if the schedule is overloaded with no breathing room, or if there's unstructured time that could be used intentionally.
- If their intention for the day doesn't connect to what's actually scheduled, gently point out the disconnect.

HOW TO SHOW UP:
- Be direct and specific. Name the exact tasks, blocks, and goals you're referring to.
- Use **bold** for emphasis and structure your responses with short sections. Use bullet points (•) to list specific findings and suggestions.
- For your opening message, organize it like:
  A brief one-line summary of how aligned their day looks, then grouped findings:
  **Aligned** — what's covered
  **Gaps** — to-dos or goals without schedule time
  **Suggestions** — concrete changes to consider
- Keep it concise. Each section should be 1–3 bullets max.
- Ask only one question per message when you need their input.
- Never say "As an AI", "Great!", "Absolutely!", or any hollow affirmations.`;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[\s]*[•\-\*]\s+(.*)/);

    if (bulletMatch) {
      const items: string[] = [bulletMatch[1]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^[\s]*[•\-\*]\s+(.*)/);
        if (!next) break;
        items.push(next[1]);
        i++;
      }
      elements.push(
        <ul key={i} className="my-1 ml-3 flex flex-col gap-0.5">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 items-baseline">
              <span className="text-amber-500 shrink-0">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i}>{renderInline(line)}</p>,
      );
    }
  }

  return <>{elements}</>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export default function CheckIn({
  open,
  onClose,
  goals,
  tasks,
  blocks,
  intention,
}: Props) {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<MessageParam[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const systemPromptRef = useRef('');

  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input after streaming ends
  useEffect(() => {
    if (!streaming && started) {
      inputRef.current?.focus();
    }
  }, [streaming, started]);

  async function sendMessage(userText: string) {
    if (streaming) return;
    setError("");

    const userMsg: MessageParam = { role: "user", content: userText };
    const apiMessages = [...messages, userMsg];
    setMessages(apiMessages);
    setStreamingContent("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPromptRef.current, messages: apiMessages }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";

      function processLine(line: string) {
        if (!line.startsWith("data: ")) return;
        const event = JSON.parse(line.slice(6));
        if (event.type === "text") {
          setStreamingContent((prev) => prev + event.text);
        } else if (event.type === "done") {
          finalText = event.text;
        } else if (event.type === "error") {
          const msg =
            event.errorType === "auth"
              ? "Invalid API key. Set ANTHROPIC_API_KEY in your .env file and restart the server."
              : event.errorType === "rate_limit"
                ? "Rate limited — wait a moment and try again."
                : event.errorType === "billing"
                  ? "Your Anthropic API credit balance is too low. Add credits at console.anthropic.com."
                  : "Something went wrong. Please try again.";
          setError(msg);
          finalText = msg;
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) processLine(line);
      }
      // Flush any remaining data in the buffer
      if (buffer.trim()) processLine(buffer);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: finalText },
      ]);
      setStreamingContent("");
    } catch {
      const msg = "Could not reach the server. Is it running?";
      setError(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      setStreamingContent("");
    } finally {
      setStreaming(false);
    }
  }

  async function handleStart() {
    // Fetch Google Calendar events before building the prompt
    let googleBlocks: TimeBlock[] = [];
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const res = await fetch(`/api/google/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`);
      if (res.ok) googleBlocks = await res.json();
    } catch { /* continue without google events */ }

    const allBlocks = [...blocks, ...googleBlocks];
    systemPromptRef.current = buildSystemPrompt(goals, tasks, allBlocks, intention);
    setStarted(true);
    sendMessage("I just opened Wellfire to start my morning.");
  }

  function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    sendMessage(text);
  }

  // Skip the auto-sent kickoff message from the visible conversation
  const displayMessages = messages.slice(1);
  const isFirstResponseStreaming =
    started && messages.length === 1 && streaming;

  return (
    <>
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[420px] z-40 flex flex-col
          bg-[#faf7f2] dark:bg-[#141210]
          border-l border-stone-200 dark:border-stone-800/80
          shadow-2xl transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 tracking-tight">
              Morning Check-in
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 dark:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {!started ? (
          /* Pre-start state */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 text-center">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="w-10 h-10 opacity-60"
            >
              <path
                d="M24 6C24 6 14 18 14 28a10 10 0 0020 0c0-5-4-9-4-9s-1 5-4 7c6-7 2-21 2-21z"
                fill="url(#flame-lg)"
              />
              <defs>
                <linearGradient
                  id="flame-lg"
                  x1="24"
                  y1="6"
                  x2="24"
                  y2="40"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Your AI already knows your goals, intention, and today's tasks.
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-600 leading-relaxed">
                It'll greet you, ask how yesterday went, and help you think
                clearly about your day.
              </p>
            </div>
            <button
              onClick={handleStart}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Start morning check-in
            </button>
          </div>
        ) : (
          /* Active conversation */
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4"
            >
              {/* Claude's greeting streams in first */}
              {(isFirstResponseStreaming || displayMessages.length > 0) && (
                <>
                  {displayMessages.map((msg, i) => {
                    const isAssistant = msg.role === "assistant";
                    return (
                      <div
                        key={i}
                        className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isAssistant
                              ? "bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-tl-sm"
                              : "bg-amber-500 text-white rounded-tr-sm"
                          }`}
                        >
                          {isAssistant ? renderMarkdown(msg.content) : msg.content}
                        </div>
                      </div>
                    );
                  })}

                  {/* Live streaming bubble */}
                  {streaming && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                        {streamingContent ? renderMarkdown(streamingContent) : <TypingDots />}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-stone-200 dark:border-stone-800/80 px-4 py-3">
              {error && (
                <p className="text-xs text-rose-500 dark:text-rose-400 mb-2 px-1">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-3 py-2 focus-within:border-amber-400/60 dark:focus-within:border-amber-500/40 transition-colors">
                <input
                  ref={inputRef}
                  placeholder={streaming ? "Claude is thinking…" : "Reply…"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={streaming}
                  className="flex-1 bg-transparent text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-600 outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  className="w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                  title="Send"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M5 1.5L8.5 5M8.5 5L5 8.5M8.5 5H1.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
