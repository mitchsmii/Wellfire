import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";

const app = express();
app.use(express.json());

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// --- Google Calendar Setup ---
const TOKENS_PATH = "google-tokens.json";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Load saved tokens on startup
if (existsSync(TOKENS_PATH)) {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  oauth2Client.setCredentials(tokens);
}

// Refresh tokens automatically when they expire
oauth2Client.on("tokens", (tokens) => {
  const existing = existsSync(TOKENS_PATH)
    ? JSON.parse(readFileSync(TOKENS_PATH, "utf-8"))
    : {};
  const merged = { ...existing, ...tokens };
  writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2));
  oauth2Client.setCredentials(merged);
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

app.post("/api/chat", async (req, res) => {
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
});

app.post("/api/weekly-summary", async (req, res) => {
  const { days } = req.body || {};
  if (!Array.isArray(days)) {
    return res.status(400).json({ error: "Expected `days` array in body" });
  }

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
  const userPrompt = `Here is the upcoming week:\n\n${lines.join("\n")}\n\nWrite a 2-4 sentence summary.`;

  try {
    const result = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 90,
      system:
        "Summarize the user's upcoming week in 1-2 short sentences. Direct, factual, no fluff. No greetings, no preamble, no advice or encouragement. Call out the busiest day, lightest day, or dominant theme. No emoji, no bullets, no headings.",
      messages: [{ role: "user", content: userPrompt }],
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
});

// --- Google OAuth Routes ---

app.get("/api/google/status", (req, res) => {
  const connected = !!oauth2Client.credentials?.refresh_token;
  res.json({ connected });
});

app.get("/api/google/calendars", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected" });
  }

  try {
    const calList = await calendar.calendarList.list();
    const calendars = (calList.data.items || [])
      .filter((c) => !c.deleted)
      .map((c) => ({
        id: c.id,
        name: c.summary || "(Unnamed)",
        color: c.backgroundColor || "#039be5",
        primary: c.primary || false,
      }));
    res.json(calendars);
  } catch (err) {
    console.error("Calendar list error:", err.message);
    res.status(500).json({ error: "Failed to list calendars" });
  }
});

app.post("/api/google/calendar/events", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected" });
  }

  const { calendarId, title, date, startTime, endTime } = req.body;
  const calId = calendarId || "primary";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const result = await calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary: title,
        start: { dateTime: `${date}T${startTime}:00`, timeZone: tz },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: tz },
      },
    });
    res.json({ googleEventId: result.data.id, calendarId: calId });
  } catch (err) {
    console.error("Calendar create error:", err.message);
    res.status(500).json({ error: "Failed to create event" });
  }
});

app.get("/api/google/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });
  res.redirect(url);
});

app.get("/api/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code parameter");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
    res.send(
      "<h2>Google Calendar connected!</h2><p>You can close this tab and return to Wellfire.</p><script>window.close()</script>"
    );
  } catch (err) {
    console.error("OAuth callback error:", err.message);
    res.status(500).send("Failed to authenticate with Google");
  }
});

app.get("/api/google/calendar/events", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected to Google Calendar" });
  }

  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params required" });
  }

  try {
    // Fetch all calendars the user has access to
    const calList = await calendar.calendarList.list();
    const calendars = (calList.data.items || []).filter((c) => !c.deleted);

    const allEvents = await Promise.all(
      calendars.map(async (cal) => {
        try {
          const response = await calendar.events.list({
            calendarId: cal.id,
            timeMin: new Date(start).toISOString(),
            timeMax: new Date(end).toISOString(),
            singleEvents: true,
            orderBy: "startTime",
          });
          return (response.data.items || []).map((e) => ({ ...e, _calId: cal.id, _calName: cal.summary, _calColor: cal.backgroundColor || "#039be5" }));
        } catch {
          return [];
        }
      })
    );

    const events = allEvents
      .flat()
      .filter((e) => e.start?.dateTime && e.end?.dateTime) // skip all-day events
      .map((e) => ({
        id: `gcal-${e.id}`,
        googleEventId: e.id,
        googleCalendarId: e._calId,
        title: e.summary || "(No title)",
        date: e.start.dateTime.split("T")[0],
        startTime: e.start.dateTime.split("T")[1].substring(0, 5),
        endTime: e.end.dateTime.split("T")[1].substring(0, 5),
        color: e._calColor,
        source: "google",
      }));

    res.json(events);
  } catch (err) {
    console.error("Calendar fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

app.patch("/api/google/calendar/events/:eventId", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected to Google Calendar" });
  }

  const { eventId } = req.params;
  const { date, startTime, endTime, title, calendarId } = req.body;
  const calId = calendarId || "primary";

  try {
    const existing = await calendar.events.get({
      calendarId: calId,
      eventId,
    });

    const patch = {};
    if (title !== undefined) patch.summary = title;
    if (date && startTime) {
      patch.start = {
        dateTime: `${date}T${startTime}:00`,
        timeZone: existing.data.start.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (date && endTime) {
      patch.end = {
        dateTime: `${date}T${endTime}:00`,
        timeZone: existing.data.end.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    await calendar.events.patch({
      calendarId: calId,
      eventId,
      requestBody: patch,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Calendar update error:", err.message);
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

app.post("/api/google/calendar/events/:eventId/move", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected to Google Calendar" });
  }

  const { eventId } = req.params;
  const { fromCalendarId, toCalendarId } = req.body;

  try {
    await calendar.events.move({
      calendarId: fromCalendarId || "primary",
      eventId,
      destination: toCalendarId,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Calendar move error:", err.message);
    res.status(500).json({ error: "Failed to move calendar event" });
  }
});

app.delete("/api/google/calendar/events/:eventId", async (req, res) => {
  if (!oauth2Client.credentials?.refresh_token) {
    return res.status(401).json({ error: "Not connected to Google Calendar" });
  }

  const calId = req.query.calendarId || "primary";

  try {
    await calendar.events.delete({
      calendarId: calId,
      eventId: req.params.eventId,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Calendar delete error:", err.message);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
