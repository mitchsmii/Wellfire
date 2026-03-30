import Anthropic from "@anthropic-ai/sdk";

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const client = new Anthropic();
  const { system, messages } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages,
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ type: "text", text: delta })}\n\n`);
    });

    const final = await stream.finalMessage();
    const text = final.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    res.write(`data: ${JSON.stringify({ type: "done", text })}\n\n`);
    res.end();
  } catch (err) {
    const isBilling =
      err instanceof Anthropic.BadRequestError &&
      err.message?.includes("credit balance");
    const errorType =
      err instanceof Anthropic.AuthenticationError
        ? "auth"
        : err instanceof Anthropic.RateLimitError
          ? "rate_limit"
          : isBilling
            ? "billing"
            : "unknown";
    console.error("API error:", err.message);
    res.write(`data: ${JSON.stringify({ type: "error", errorType })}\n\n`);
    res.end();
  }
}
