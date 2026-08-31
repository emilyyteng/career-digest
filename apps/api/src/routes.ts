import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { getBoardRefresh, startBoardRefresh } from "./boardRefresh.js";
import { getBackupJob, startBackupJob } from "./backupJob.js";
import { getLiveRankBacklogJob, startLiveRankBacklogJob } from "./liveRankBacklogJob.js";
import {
  addApplicationDocument,
  createApplication,
  deleteApplication,
  getApplication,
  getApplicationDocument,
  listApplicationLocations,
  listApplications,
  patchApplication,
} from "./applications.js";
import { pool } from "./db.js";
import { getHomeDashboard } from "./home.js";
import { getOpsStatus } from "./opsStatus.js";
import { getRankBatchStatus } from "./rankBatchStatus.js";
import {
  assertJobRerankable,
  deleteJobFeedback,
  getJobById,
  listJobs,
  patchJobUrl,
  upsertJobFeedback,
} from "./jobs.js";
import { parseHttpUrl } from "./parsing.js";
import { getRerankQueueSnapshot, queueRerank } from "./rankRerankQueue.js";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
  isLegacyApplicationBacklogStatus,
  normalizeApplicationStatus,
} from "./statuses.js";
import {
  addInterviewStep,
  addThreadMembers,
  createInterviewThread,
  getInterviewThread,
  listInterviewThreads,
  listPickerApplications,
  patchInterviewStep,
  patchInterviewThread,
} from "./interviews.js";
import {
  completeTask,
  createTask,
  createTaskFromPosting,
  deleteTask,
  deleteTaskByPostingId,
  isTaskView,
  listTasks,
  parseCreateTaskBody,
  parsePatchTaskBody,
  patchTask,
  reopenTask,
} from "./tasks.js";
import {
  createReflectionLog,
  getProgressDay,
  getProgressHeatmap,
  getProgressOutcome,
  getProgressToday,
  isProgressLane,
  isProgressPeriod,
  parseAnchorDate,
  parseLocalDate,
  resolveTimezone,
  setLeetcodeDaily,
  updateReflectionLog,
} from "./progress.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const uploadDir = path.join(root, "data/uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const api = express.Router();

api.get("/board/refresh", async (_req, res) => {
  res.json(await getBoardRefresh());
});

api.post("/board/refresh", async (_req, res) => {
  const result = await startBoardRefresh();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/backup", async (_req, res) => {
  res.json(await getBackupJob());
});

api.post("/backup", async (_req, res) => {
  const result = await startBackupJob();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/rank/live-backlog", async (_req, res) => {
  res.json(await getLiveRankBacklogJob());
});

api.post("/rank/live-backlog", async (_req, res) => {
  const result = await startLiveRankBacklogJob();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/rank/batch", async (_req, res) => {
  res.json(await getRankBatchStatus());
});

api.get("/ops", async (_req, res) => {
  res.json(await getOpsStatus());
});

api.get("/home", async (_req, res) => {
  res.json(await getHomeDashboard());
});

api.get("/jobs/rerank-queue", async (_req, res) => {
  res.json(getRerankQueueSnapshot());
});

api.get("/jobs", async (req, res) => {
  res.json(
    await listJobs({
      q: String(req.query.q ?? ""),
      view: String(req.query.view ?? "ranked"),
      sort: String(req.query.sort ?? "rank"),
      pageSize: req.query.pageSize,
      page: req.query.page,
      loc: String(req.query.loc ?? ""),
    }),
  );
});

api.get("/jobs/:id", async (req, res) => {
  const job = await getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(job);
});

api.patch("/jobs/:id", async (req, res) => {
  const body = req.body as { url?: string };
  if (!Object.prototype.hasOwnProperty.call(body, "url")) {
    res.status(400).json({ error: "url is required" });
    return;
  }
  const url = parseHttpUrl(body.url);
  if (!url) {
    res.status(400).json({ error: "Invalid URL — use http:// or https://" });
    return;
  }
  const updated = await patchJobUrl(req.params.id, url);
  if (!updated) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(updated);
});

api.post("/jobs/:id/feedback", async (req, res) => {
  const kind = String((req.body as { kind?: string }).kind ?? "");
  const note = String((req.body as { note?: string }).note ?? "").trim() || null;
  try {
    const row = await upsertJobFeedback(req.params.id, kind, note);
    res.status(201).json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Job not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/jobs/:id/rerank", async (req, res) => {
  const note = String((req.body as { note?: string }).note ?? "").trim();
  if (!note) {
    res.status(400).json({ error: "note is required" });
    return;
  }
  try {
    await assertJobRerankable(req.params.id);
    const result = queueRerank(req.params.id, note);
    res.status(result.alreadyQueued ? 409 : 202).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Job not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/jobs/:id/feedback", async (req, res) => {
  const deleted = await deleteJobFeedback(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "No feedback on this job" });
    return;
  }
  res.json({ ok: true });
});

api.get("/applications", async (req, res) => {
  const status = String(req.query.status ?? "all");
  if (isLegacyApplicationBacklogStatus(status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  if (status !== "all" && !isApplicationStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const filter = status === "all" ? "all" : normalizeApplicationStatus(status);
  res.json(await listApplications(pool, filter));
});

api.get("/applications/locations", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const locations = await listApplicationLocations(pool, q);
  res.json({ locations });
});

api.get("/applications/:id", async (req, res) => {
  const application = await getApplication(pool, req.params.id);
  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(application);
});

api.post("/applications", async (req, res) => {
  const body = req.body as {
    postingId?: string;
    status?: string;
    notes?: string;
    company?: string;
    title?: string;
    location?: string;
    url?: string;
    description?: string;
    descriptionHtml?: string;
    appliedAt?: string | null;
    dueAt?: string | null;
  };
  if (body.status && isLegacyApplicationBacklogStatus(body.status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  const status = normalizeApplicationStatus(body.status ?? "applied");
  if (!isApplicationStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const created = await createApplication(pool, {
      postingId: body.postingId,
      status,
      notes: body.notes ?? null,
      company: body.company,
      title: body.title,
      location: body.location,
      url: body.url,
      description: body.description,
      descriptionHtml: body.descriptionHtml,
      appliedAt: body.appliedAt,
      appliedAtProvided: Object.prototype.hasOwnProperty.call(body, "appliedAt"),
    });
    res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

api.patch("/applications/:id", async (req, res) => {
  const body = req.body as {
    status?: string;
    notes?: string;
    postingId?: string | null;
    appliedAt?: string | null;
    dueAt?: string | null;
    url?: string | null;
    description?: string;
    descriptionHtml?: string | null;
  };
  if (body.status && isLegacyApplicationBacklogStatus(body.status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  if (body.status && !isApplicationStatus(body.status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const result = await patchApplication(pool, req.params.id, {
      status: body.status ? normalizeApplicationStatus(body.status) : undefined,
      notes: body.notes,
      postingId: body.postingId,
      appliedAt: body.appliedAt,
      dueAt: body.dueAt,
      url: body.url,
      description: body.description,
      descriptionHtml: body.descriptionHtml,
      appliedAtProvided: Object.prototype.hasOwnProperty.call(body, "appliedAt"),
      dueAtProvided: Object.prototype.hasOwnProperty.call(body, "dueAt"),
      urlProvided: Object.prototype.hasOwnProperty.call(body, "url"),
      postingIdProvided: Object.prototype.hasOwnProperty.call(body, "postingId"),
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    if (message === "Application not found") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "Invalid URL — use http:// or https://") {
      res.status(400).json({ error: message });
      return;
    }
    if (message === "That posting is already linked to an application") {
      res.status(409).json({ error: message });
      return;
    }
    throw err;
  }
});

api.get("/interviews/picker-applications", async (_req, res) => {
  try {
    const applications = await listPickerApplications(pool);
    res.json({ applications });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bad request" });
  }
});

api.get("/interviews", async (req, res) => {
  const view = req.query.view === "past" ? "past" : "active";
  const data = await listInterviewThreads(pool, view);
  res.json(data);
});

api.post("/interviews", async (req, res) => {
  try {
    const body = req.body as {
      applicationIds?: string[];
      primaryApplicationId?: string;
      label?: string | null;
      step?: {
        kind?: string;
        title?: string;
        status?: string;
        dueAt?: string | null;
        scheduledAt?: string | null;
        url?: string | null;
        notes?: string | null;
      };
    };
    if (!body.step?.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const threadId = await createInterviewThread(pool, {
      applicationIds: body.applicationIds ?? [],
      primaryApplicationId: body.primaryApplicationId,
      label: body.label,
      step: {
        kind: body.step.kind,
        title: body.step.title,
        status: body.step.status,
        dueAt: body.step.dueAt,
        scheduledAt: body.step.scheduledAt,
        url: body.step.url,
        notes: body.step.notes,
      },
    });
    res.status(201).json({ id: threadId });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bad request" });
  }
});

api.get("/interviews/:threadId", async (req, res) => {
  const thread = await getInterviewThread(pool, req.params.threadId);
  if (!thread) {
    res.status(404).json({ error: "Interview thread not found" });
    return;
  }
  res.json(thread);
});

api.patch("/interviews/:threadId", async (req, res) => {
  try {
    const body = req.body as {
      primaryApplicationId?: string;
      label?: string | null;
      status?: string;
      resolution?: string | null;
      addApplicationIds?: string[];
    };
    if (body.addApplicationIds?.length) {
      await addThreadMembers(pool, req.params.threadId, body.addApplicationIds);
    }
    await patchInterviewThread(pool, req.params.threadId, body);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/interviews/:threadId/steps", async (req, res) => {
  try {
    const body = req.body as {
      kind?: string;
      title?: string;
      status?: string;
      dueAt?: string | null;
      scheduledAt?: string | null;
      url?: string | null;
      notes?: string | null;
      prepNotes?: string | null;
    };
    if (!body.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const stepId = await addInterviewStep(pool, req.params.threadId, {
      kind: body.kind,
      title: body.title,
      status: body.status,
      dueAt: body.dueAt,
      scheduledAt: body.scheduledAt,
      url: body.url,
      notes: body.notes,
      prepNotes: body.prepNotes,
    });
    res.status(201).json({ id: stepId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/interviews/:threadId/steps/:stepId", async (req, res) => {
  try {
    const body = req.body as {
      kind?: string;
      title?: string;
      status?: string;
      dueAt?: string | null;
      scheduledAt?: string | null;
      url?: string | null;
      notes?: string | null;
      prepNotes?: string | null;
    };
    await patchInterviewStep(pool, req.params.threadId, req.params.stepId, body);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/applications/:id", async (req, res) => {
  const deleted = await deleteApplication(pool, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json({ ok: true });
});

api.post("/applications/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing file" });
    return;
  }
  const inserted = await addApplicationDocument(pool, req.params.id, {
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
  });
  if (!inserted) {
    await unlink(req.file.path).catch(() => undefined);
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.status(201).json(inserted);
});

api.get("/applications/:id/documents/:docId", async (req, res) => {
  const doc = await getApplicationDocument(pool, req.params.id, req.params.docId, uploadDir);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const inline = req.query.view === "1" || req.query.inline === "1";
  if (inline) {
    const mime = doc.mimeType || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
    );
    res.sendFile(doc.filePath);
    return;
  }
  res.download(doc.filePath, doc.originalName);
});

api.get("/tasks", async (req, res) => {
  const view = String(req.query.view ?? "open");
  if (!isTaskView(view)) {
    res.status(400).json({ error: "Invalid view" });
    return;
  }
  res.json(await listTasks(pool, view));
});

api.post("/tasks/from-posting", async (req, res) => {
  const postingId = (req.body as { postingId?: string }).postingId;
  if (!postingId || typeof postingId !== "string") {
    res.status(400).json({ error: "postingId is required" });
    return;
  }
  try {
    const task = await createTaskFromPosting(pool, postingId);
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      message === "Posting not found"
        ? 404
        : message.includes("already has a tracker")
          ? 409
          : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/tasks/from-posting/:postingId", async (req, res) => {
  const deleted = await deleteTaskByPostingId(pool, req.params.postingId);
  if (!deleted) {
    res.status(404).json({ error: "Open application task not found for posting" });
    return;
  }
  res.json({ ok: true });
});

api.post("/tasks", async (req, res) => {
  const parsed = parseCreateTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task payload" });
    return;
  }
  const task = await createTask(pool, parsed);
  res.status(201).json(task);
});

api.patch("/tasks/:id", async (req, res) => {
  const parsed = parsePatchTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  try {
    const task = await patchTask(pool, req.params.id, parsed);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("already linked") ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:id/complete", async (req, res) => {
  const task = await completeTask(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot complete" });
    return;
  }
  res.json(task);
});

api.post("/tasks/:id/reopen", async (req, res) => {
  const task = await reopenTask(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot reopen" });
    return;
  }
  res.json(task);
});

api.delete("/tasks/:id", async (req, res) => {
  const deleted = await deleteTask(pool, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true });
});

api.get("/progress/today", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  res.json(await getProgressToday(pool, tz));
});

api.get("/progress/heatmap", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const lane = String(req.query.lane ?? "application");
  if (!isProgressLane(lane)) {
    res.status(400).json({ error: "lane must be application or technical" });
    return;
  }
  const rawDays = Number(req.query.days);
  const days = Number.isFinite(rawDays) ? rawDays : 365;
  res.json(await getProgressHeatmap(pool, lane, tz, days));
});

api.get("/progress/outcome", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const period = String(req.query.period ?? "");
  if (!isProgressPeriod(period)) {
    res.status(400).json({ error: "period must be day, week, or month" });
    return;
  }
  try {
    const anchorDate = parseAnchorDate(
      typeof req.query.date === "string" ? req.query.date : undefined,
      tz,
    );
    const outcome = await getProgressOutcome(pool, period, tz, anchorDate);
    if (!outcome) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    res.json(outcome);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

api.get("/progress/day/:date", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const date = parseLocalDate(req.params.date);
  if (!date) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  res.json(await getProgressDay(pool, tz, date));
});

api.patch("/progress/leetcode", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const body = req.body as { count?: number; delta?: number; date?: string };
  try {
    res.json(await setLeetcodeDaily(pool, tz, body));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

api.post("/progress/reflections", async (req, res) => {
  const body = req.body as {
    lane?: string;
    body?: string;
    applicationId?: string | null;
    localDate?: string | null;
    tz?: string | null;
  };
  const lane = body.lane ?? "";
  if (!isProgressLane(lane)) {
    res.status(400).json({ error: "lane must be application or technical" });
    return;
  }
  if (!body.body || typeof body.body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const row = await createReflectionLog(pool, {
      lane,
      body: body.body,
      applicationId: body.applicationId ?? null,
      localDate: body.localDate ?? null,
      tz: body.tz ?? (typeof req.query.tz === "string" ? req.query.tz : null),
    });
    res.status(201).json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message === "Application not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/progress/reflections/:id", async (req, res) => {
  const body = req.body as { body?: string };
  if (!body.body || typeof body.body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const row = await updateReflectionLog(pool, req.params.id, body.body);
    if (!row) {
      res.status(404).json({ error: "Reflection not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
}

export { APPLICATION_STATUSES };
