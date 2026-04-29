import Anthropic from "@anthropic-ai/sdk";

export const config = {
  maxDuration: 15,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const client = new Anthropic();
  const { days } = req.body || {};

  if (!Array.isArray(days)) {
    return res.status(400).json({ error: "Expected `days` array in body" });
  }

  const prompt = buildPrompt(days);

  try {
    const result = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 90,
      system:
        "Summarize the user's upcoming week in 1-2 short sentences. Direct, factual, no fluff. No greetings, no preamble, no advice or encouragement. Call out the busiest day, lightest day, or dominant theme. No emoji, no bullets, no headings.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    res.json({ summary: text });
  } catch (err) {
    console.error("Weekly summary error:", err.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
}

function buildPrompt(days) {
  const lines = days.map((d) => {
    const blocks = (d.blocks || [])
      .map((b) => `${b.startTime}-${b.endTime} ${b.title}`)
      .join("; ");
    const tasks = (d.tasks || []).map((t) => t.text).join("; ");
    const parts = [];
    if (blocks) parts.push(`scheduled: ${blocks}`);
    if (tasks) parts.push(`tasks: ${tasks}`);
    return `${d.label} (${d.iso}) — ${parts.length ? parts.join(" | ") : "open"}`;
  });
  return `Here is the upcoming week:\n\n${lines.join("\n")}\n\nWrite a 2-4 sentence summary.`;
}
