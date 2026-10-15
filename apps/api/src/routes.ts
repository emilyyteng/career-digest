import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import type { Pool } from "pg";
import { getBoardRefresh, startBoardRefresh } from "./boardRefresh.js";
import { getBackupJob, startBackupJob } from "./backupJob.js";
import { getLiveRankBacklogJob, startLiveRankBacklogJob } from "./liveRankBacklogJob.js";
import {
  addApplicationDocument,
  createApplication,
  deleteApplication,
  deleteApplicationDocument,
  ensureApplicationToMarkApplied,
  getApplication,
  TODO_APPLICATION_STATUS_ERROR,
  getApplicationDocument,
  listApplicationLocations,
  listApplications,
  patchApplication,
  setApplicationActualMinutes,
} from "./applications.js";
import { pool } from "./db.js";
import { getHomeDashboard } from "./home.js";
import { normalizeUpcomingWindowDays } from "./homeUpcoming.js";
import { DemoGatedError, assertDemoAllowsMutation, isDemoMode } from "./demoMode.js";
import { markDemoResetDone } from "./demoScheduler.js";
import { resetDemoDatabase } from "./demoSeed.js";
import { getOpsStatus } from "./opsStatus.js";
import { getRankBatchStatus } from "./rankBatchStatus.js";
import {
  assertJobRerankable,
  deleteJobFeedback,
  getJobById,
  hideFromBoard,
  listJobs,
  listRankedBoardSiblings,
  patchJobUrl,
  upsertJobFeedback,
} from "./jobs.js";
import { MarkAppliedError, markApplied, type MarkAppliedReflection } from "./markApplied.js";
import { parseHttpUrl, resolveAppliedAt } from "./parsing.js";
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
  setInterviewStepActualMinutes,
} from "./interviews.js";
import {
  completeTask,
  createTask,
  createTaskFromPosting,
  deleteTask,
  deleteTaskByPostingId,
  duplicateTask,
  getTaskById,
  isTaskView,
  listTasks,
  parseCreateTaskBody,
  parsePatchTaskBody,
  patchTask,
  reopenTask,
} from "./tasks.js";
import {
  completeSubtask,
  createSubtask,
  deleteSubtask,
  moveSubtask,
  patchSubtask,
  reopenSubtask,
  reorderSubtasks,
} from "./taskSubtasks.js";
import {
  createTaskCategory,
  deleteTaskCategory,
  listTaskCategories,
  renameTaskCategory,
} from "./taskCategories.js";
import {
  createReflectionLog,
  getProgressDay,
  getProgressHeatmap,
  getProgressOutcome,
  getProgressToday,
  isProgressHeatmapLane,
  isProgressLane,
  isProgressPeriod,
  listInterviewStepsForApplication,
  listReflectionsForApplication,
  listReflectionsForTask,
  listUnlinkedReflections,
  parseAnchorDate,
  parseLocalDate,
  resolveTimezone,
  changeLeetcode,
  updateReflectionLog,
  type ProgressLane,
} from "./progress.js";
import {
  getWeeklyGoalsSnapshot,
  patchLcGoal,
  setAppTargetMembership,
} from "./weeklyGoals.js";
import { isLeetcodeTier } from "./pointsFormulas.js";
import {
  adjustApplicationActual,
  adjustInterviewFinishActual,
  awardApplicationApplied,
  awardInterviewFinish,
  awardMiscTaskComplete,
  adjustTaskCompleteActual,
  reverseTaskComplete,
} from "./pointsAwards.js";
import {
  getEarningsSnapshot,
  getPointsSummary,
  isEarningsRange,
  listPointsEvents,
  serializePointsEarn,
  type PointsEarnInfo,
} from "./pointsLedger.js";
import {
  getCompletionsDiary,
  type CompletionKind,
} from "./completionsDiary.js";
import { getLifetimeSnapshot } from "./lifetime.js";
import { listAchievements, syncAchievements } from "./achievements.js";
import { getCatCakeCollection } from "./catCakeCollection.js";
import {
  pullCatCakes,
  refundOneDuplicate,
  selectCeLook,
} from "./catCakeGacha.js";
import { resolveEarningsRangeBounds } from "./earningsRange.js";
import { getPullHistorySnapshot } from "./pullHistory.js";
import { getRewardsRulesPayload } from "./rewardsRules.js";
import { isValidTimezone } from "./progress.js";

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

/** The optional reflection from a completion / mark-applied modal. */
function parseModalReflection(
  raw: { lane?: string; body?: string } | null | undefined,
): { value: MarkAppliedReflection | null } | { error: string } {
  if (!raw?.body || typeof raw.body !== "string") return { value: null };
  const lane = raw.lane ?? "";
  if (!isProgressLane(lane)) {
    return { error: "reflection.lane must be application, technical, or other" };
  }
  return { value: { lane, body: raw.body } };
}

/** Work time from a request body: absent, cleared (null), or whole minutes ≥ 0. */
function parseActualMinutes(
  raw: unknown,
): { value: number | null | undefined } | { error: string } {
  if (raw === undefined) return { value: undefined };
  if (raw === null) return { value: null };
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return { error: "Invalid actualMinutes" };
  }
  return { value: Math.floor(raw) };
}

function applicationLabel(app: { company: string | null; title: string | null }): string {
  return app.company
    ? `${app.company}${app.title ? ` · ${app.title}` : ""}`
    : app.title ?? "Application";
}

async function appendTaskNotes(
  db: Pool,
  taskId: string,
  existing: string | null,
  incoming: unknown,
): Promise<void> {
  if (typeof incoming !== "string" || !incoming.trim()) return;
  const merged = [existing?.trim(), incoming.trim()].filter(Boolean).join("\n\n");
  await patchTask(db, taskId, { notes: merged });
}

api.get("/board/refresh", async (_req, res) => {
  res.json(await getBoardRefresh());
});

api.post("/board/refresh", async (_req, res) => {
  try {
    assertDemoAllowsMutation();
  } catch (err) {
    if (err instanceof DemoGatedError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
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
  try {
    assertDemoAllowsMutation();
  } catch (err) {
    if (err instanceof DemoGatedError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
  const result = await startLiveRankBacklogJob();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/rank/batch", async (_req, res) => {
  res.json(await getRankBatchStatus());
});

api.get("/ops", async (_req, res) => {
  res.json(await getOpsStatus());
});

api.post("/demo/reset", async (_req, res) => {
  if (!isDemoMode()) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const summary = await resetDemoDatabase(pool);
    markDemoResetDone();
    res.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

api.get("/home", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  const upcomingDays = normalizeUpcomingWindowDays(req.query.upcomingDays);
  res.json(await getHomeDashboard(tz, upcomingDays));
});

api.get("/jobs/rerank-queue", async (_req, res) => {
  res.json(getRerankQueueSnapshot());
});

api.post("/jobs/hide-from-board", async (req, res) => {
  const postingIds = (req.body as { postingIds?: unknown }).postingIds;
  if (!Array.isArray(postingIds) || !postingIds.every((id) => typeof id === "string")) {
    res.status(400).json({ error: "postingIds must be an array of strings" });
    return;
  }
  try {
    res.json(await hideFromBoard(postingIds));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
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
      source: String(req.query.source ?? ""),
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

api.get("/jobs/:id/board-siblings", async (req, res) => {
  try {
    res.json(await listRankedBoardSiblings(req.params.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Job not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
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
  const body = req.body as { kind?: string; note?: string; teach?: unknown };
  const kind = String(body.kind ?? "");
  const note = String(body.note ?? "").trim() || null;
  const teach = body.teach === false ? false : true;
  try {
    const row = await upsertJobFeedback(req.params.id, kind, note, teach);
    res.status(201).json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "Job not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/jobs/:id/rerank", async (req, res) => {
  try {
    assertDemoAllowsMutation();
  } catch (err) {
    if (err instanceof DemoGatedError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
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
    actualMinutes?: number | null;
    reflection?: {
      lane?: string;
      body?: string;
    } | null;
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

  const reflection = parseModalReflection(body.reflection);
  if ("error" in reflection) {
    res.status(400).json({ error: reflection.error });
    return;
  }
  const actualMinutes = parseActualMinutes(body.actualMinutes);
  if ("error" in actualMinutes) {
    res.status(400).json({ error: actualMinutes.error });
    return;
  }

  const appliedAtProvided = Object.prototype.hasOwnProperty.call(body, "appliedAt");
  try {
    if (status === "applied") {
      const appliedAt = resolveAppliedAt({
        status,
        explicit: body.appliedAt,
        explicitProvided: appliedAtProvided,
      });
      const result = await markApplied(pool, {
        resolveApplication: (client) =>
          ensureApplicationToMarkApplied(client, {
            postingId: body.postingId,
            company: body.company,
            title: body.title,
            location: body.location,
            url: body.url,
            description: body.description,
            descriptionHtml: body.descriptionHtml,
          }),
        appliedAt,
        notes: body.notes ?? null,
        actualMinutes: actualMinutes.value ?? null,
        reflection: reflection.value,
        tz: resolveTimezone(String(req.query.tz ?? "")),
      });
      res.status(201).json({
        id: result.applicationId,
        points: serializePointsEarn(result.points),
        achievementUnlocks: result.achievementUnlocks,
      });
      return;
    }

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
      appliedAtProvided,
    });
    if (reflection.value) {
      await createReflectionLog(pool, {
        ...reflection.value,
        applicationId: created.id,
        awardPoints: false,
      });
    }
    res.status(201).json({ ...created, points: null });
  } catch (err) {
    if (err instanceof MarkAppliedError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(message === TODO_APPLICATION_STATUS_ERROR ? 409 : 400).json({ error: message });
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
    actualMinutes?: number | null;
  };
  if (body.status && isLegacyApplicationBacklogStatus(body.status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  if (body.status && !isApplicationStatus(body.status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const actualMinutes = parseActualMinutes(body.actualMinutes);
  if ("error" in actualMinutes) {
    res.status(400).json({ error: actualMinutes.error });
    return;
  }
  try {
    const before = await getApplication(pool, req.params.id);
    const nextStatus = body.status ? normalizeApplicationStatus(body.status) : undefined;
    if (before?.status === "todo" && (nextStatus || actualMinutes.value !== undefined)) {
      res.status(409).json({ error: TODO_APPLICATION_STATUS_ERROR });
      return;
    }
    const result = await patchApplication(pool, req.params.id, {
      status: nextStatus,
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
    let points: PointsEarnInfo | null = null;
    let achievementUnlocks: Awaited<ReturnType<typeof syncAchievements>> = [];
    if (
      before &&
      nextStatus === "applied" &&
      before.status !== "applied"
    ) {
      const { event, created } = await awardApplicationApplied(pool, {
        applicationId: before.id,
        label: applicationLabel(before),
        actualMinutes: before.actualMinutes,
      });
      if (created) points = serializePointsEarn(event);
      achievementUnlocks = await syncAchievements(pool);
    }
    if (
      before &&
      actualMinutes.value !== undefined &&
      actualMinutes.value !== before.actualMinutes
    ) {
      await setApplicationActualMinutes(pool, before.id, actualMinutes.value);
      const { event } = await adjustApplicationActual(pool, {
        applicationId: before.id,
        label: applicationLabel(before),
        actualMinutes: actualMinutes.value,
      });
      if (event) points = serializePointsEarn(event);
      const refreshed = await getApplication(pool, before.id);
      res.json({ ...(refreshed ?? result), points, achievementUnlocks });
      return;
    }
    res.json({ ...result, points, achievementUnlocks });
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
        actualMinutes?: number | null;
      };
    };
    if (!body.step?.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const actualMinutes = parseActualMinutes(body.step.actualMinutes);
    if ("error" in actualMinutes) {
      res.status(400).json({ error: actualMinutes.error });
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
        actualMinutes: actualMinutes.value ?? null,
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
      actualMinutes?: number | null;
    };
    if (!body.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const actualMinutes = parseActualMinutes(body.actualMinutes);
    if ("error" in actualMinutes) {
      res.status(400).json({ error: actualMinutes.error });
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
      actualMinutes: actualMinutes.value ?? null,
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
      actualMinutes?: number | null;
      reflection?: {
        lane?: string;
        body?: string;
      } | null;
    };
    const actualMinutes = parseActualMinutes(body.actualMinutes);
    if ("error" in actualMinutes) {
      res.status(400).json({ error: actualMinutes.error });
      return;
    }
    const reflection = parseModalReflection(body.reflection);
    if ("error" in reflection) {
      res.status(400).json({ error: reflection.error });
      return;
    }
    const thread = await getInterviewThread(pool, req.params.threadId);
    const before = thread?.steps.find((s) => s.id === req.params.stepId);
    const finishStatuses = new Set(["completed", "awaiting_employer"]);
    const finishing =
      before != null &&
      body.status != null &&
      finishStatuses.has(body.status) &&
      !finishStatuses.has(before.status);
    const finishedAfter = body.status
      ? finishStatuses.has(body.status)
      : before != null && finishStatuses.has(before.status);
    await patchInterviewStep(pool, req.params.threadId, req.params.stepId, body);
    if (!before || !thread) {
      res.json({ ok: true, points: null });
      return;
    }
    const label = thread.company ? `${thread.company} · ${before.title}` : before.title;
    const kind = body.kind ?? before.kind;
    // Like mark applied, a blank time when finishing keeps the step's saved time.
    const minutes = finishing
      ? actualMinutes.value ?? before.actualMinutes
      : actualMinutes.value !== undefined
        ? actualMinutes.value
        : before.actualMinutes;
    if (minutes !== before.actualMinutes) {
      await setInterviewStepActualMinutes(pool, before.id, minutes);
    }
    if (finishing) {
      if (reflection.value) {
        await createReflectionLog(pool, {
          ...reflection.value,
          applicationId: thread.primaryApplicationId ?? null,
          interviewStepId: before.id,
          awardPoints: false,
        });
      }
      const { event, created } = await awardInterviewFinish(pool, {
        stepId: before.id,
        label,
        kind,
        withReflection: reflection.value != null,
        actualMinutes: minutes,
      });
      if (created) {
        const achievementUnlocks = await syncAchievements(pool);
        res.json({
          ok: true,
          points: serializePointsEarn(event),
          achievementUnlocks,
        });
        return;
      }
    }
    // A re-finish earns nothing again (R4.11), but a changed time still re-scores the one earn.
    // Time on an unfinished step is planned time: it re-scores an earn kept from an earlier
    // finish but never creates one.
    if (minutes !== before.actualMinutes) {
      const { event } = await adjustInterviewFinishActual(pool, {
        stepId: before.id,
        label,
        kind,
        actualMinutes: minutes,
        seedIfMissing: finishedAfter,
      });
      res.json({ ok: true, points: event ? serializePointsEarn(event) : null });
      return;
    }
    res.json({ ok: true, points: null });
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
  // multer's handler typing widens params; a `:id` segment is always one string.
  const { id: applicationId } = req.params as { id: string };
  const inserted = await addApplicationDocument(pool, applicationId, {
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

api.delete("/applications/:id/documents/:docId", async (req, res) => {
  const deleted = await deleteApplicationDocument(
    pool,
    req.params.id,
    req.params.docId,
    uploadDir,
  );
  if (!deleted) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json({ ok: true });
});

api.get("/tasks", async (req, res) => {
  const view = String(req.query.view ?? "open");
  if (!isTaskView(view)) {
    res.status(400).json({ error: "Invalid view" });
    return;
  }
  const includeApplicationCompleted =
    view === "completed" &&
    (req.query.includeApplication === "1" || req.query.includeApplication === "true");
  res.json(await listTasks(pool, view, { includeApplicationCompleted }));
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

api.get("/task-categories", async (_req, res) => {
  res.json({ categories: await listTaskCategories(pool) });
});

api.post("/task-categories", async (req, res) => {
  const name = (req.body as { name?: unknown }).name;
  if (typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const category = await createTaskCategory(pool, name);
    res.status(201).json(category);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/task-categories/:id", async (req, res) => {
  const name = (req.body as { name?: unknown }).name;
  if (typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const category = await renameTaskCategory(pool, req.params.id, name);
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(category);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/task-categories/:id", async (req, res) => {
  try {
    const result = await deleteTaskCategory(pool, req.params.id);
    if (result === "missing") {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    if (result === "blocked") {
      res.status(409).json({ error: "Category still has open tasks" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks", async (req, res) => {
  const parsed = parseCreateTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task payload" });
    return;
  }
  try {
    const task = await createTask(pool, parsed);
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 400;
    res.status(status).json({ error: message });
  }
});

api.get("/tasks/:id", async (req, res) => {
  const task = await getTaskById(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

api.patch("/tasks/:id", async (req, res) => {
  const parsed = parsePatchTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  try {
    const before = await getTaskById(pool, req.params.id);
    if (
      before?.category === "application" &&
      before.status === "completed" &&
      before.applicationId &&
      parsed.actualMinutes !== undefined
    ) {
      const { actualMinutes, ...rest } = parsed;
      if (Object.keys(rest).length > 0) await patchTask(pool, before.id, rest);
      let points: PointsEarnInfo | null = null;
      if (actualMinutes !== before.actualMinutes) {
        const app = await getApplication(pool, before.applicationId);
        await setApplicationActualMinutes(pool, before.applicationId, actualMinutes ?? null);
        const { event } = await adjustApplicationActual(pool, {
          applicationId: before.applicationId,
          label: app ? applicationLabel(app) : before.title,
          actualMinutes: actualMinutes ?? null,
        });
        if (event) points = serializePointsEarn(event);
      }
      res.json({ ...(await getTaskById(pool, before.id)), points });
      return;
    }
    const task = await patchTask(pool, req.params.id, parsed);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (
      before &&
      task.status === "completed" &&
      task.category === "misc" &&
      parsed.actualMinutes !== undefined &&
      parsed.actualMinutes !== before.actualMinutes
    ) {
      const earn = await pool.query<{ meta: { with_reflection?: boolean } }>(
        `SELECT meta FROM points_events
         WHERE kind = 'earn' AND source_type = 'task_complete' AND source_id = $1
         LIMIT 1`,
        [task.id],
      );
      let withReflection = Boolean(earn.rows[0]?.meta?.with_reflection);
      if (!earn.rows[0]) {
        const linked = await pool.query<{ ok: boolean }>(
          `SELECT EXISTS(
             SELECT 1 FROM reflection_logs WHERE task_id = $1
           ) AS ok`,
          [task.id],
        );
        withReflection = Boolean(linked.rows[0]?.ok);
      }
      const { event } = await adjustTaskCompleteActual(pool, {
        taskId: task.id,
        title: task.title,
        actualMinutes: task.actualMinutes,
        withReflection,
      });
      const refreshed = await getTaskById(pool, task.id);
      res.json({ ...(refreshed ?? task), points: event ? serializePointsEarn(event) : null });
      return;
    }
    res.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : message.includes("already linked")
          ? 409
          : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:id/complete", async (req, res) => {
  const body = (req.body ?? {}) as {
    actualMinutes?: number | null;
    reflection?: {
      lane?: string;
      body?: string;
    } | null;
    notes?: string | null;
  };

  let actualMinutes: number | null | undefined = undefined;
  if (body.actualMinutes !== undefined) {
    if (body.actualMinutes === null) actualMinutes = null;
    else if (!Number.isFinite(body.actualMinutes) || body.actualMinutes < 0) {
      res.status(400).json({ error: "Invalid actualMinutes" });
      return;
    } else actualMinutes = Math.floor(body.actualMinutes);
  }

  const before = await getTaskById(pool, req.params.id);
  if (!before) {
    res.status(404).json({ error: "Task not found or cannot complete" });
    return;
  }

  const reflection = parseModalReflection(body.reflection);
  if ("error" in reflection) {
    res.status(400).json({ error: reflection.error });
    return;
  }
  const withReflection = reflection.value != null;

  if (before.category === "application") {
    const applicationId = before.applicationId;
    if (before.status !== "open" || !applicationId) {
      res.status(404).json({ error: "Task not found or cannot complete" });
      return;
    }
    try {
      const result = await markApplied(pool, {
        resolveApplication: async () => applicationId,
        notes: typeof body.notes === "string" ? body.notes : null,
        actualMinutes: actualMinutes ?? null,
        reflection: reflection.value,
        tz: resolveTimezone(String(req.query.tz ?? "")),
      });
      const task = await getTaskById(pool, before.id);
      res.json({
        ...task,
        points: serializePointsEarn(result.points),
        achievementUnlocks: result.achievementUnlocks,
      });
    } catch (err) {
      if (err instanceof MarkAppliedError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Bad request";
      res.status(400).json({ error: message });
    }
    return;
  }

  if (reflection.value) {
    try {
      await createReflectionLog(pool, {
        ...reflection.value,
        taskId: before.id,
        awardPoints: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bad request";
      res.status(400).json({ error: message });
      return;
    }
  }

  await appendTaskNotes(pool, before.id, before.notes, body.notes);

  const task = await completeTask(pool, req.params.id, { actualMinutes });
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot complete" });
    return;
  }

  let points: PointsEarnInfo | null = null;
  try {
    if (task.category === "misc") {
      const event = await awardMiscTaskComplete(pool, {
        taskId: task.id,
        title: task.title,
        actualMinutes: task.actualMinutes,
        withReflection,
      });
      points = serializePointsEarn(event);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Points error";
    res.status(500).json({ error: message });
    return;
  }

  res.json({ ...task, points });
});

api.post("/tasks/:id/duplicate", async (req, res) => {
  try {
    const task = await duplicateTask(pool, req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:id/reopen", async (req, res) => {
  const existing = await getTaskById(pool, req.params.id);
  const task = await reopenTask(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot reopen" });
    return;
  }
  if (existing) {
    await reverseTaskComplete(pool, existing.id, existing.title);
  }
  res.json(task);
});

api.get("/points", async (_req, res) => {
  res.json(await getPointsSummary(pool));
});

api.get("/rewards/collection", async (_req, res) => {
  res.json(await getCatCakeCollection(pool));
});

api.get("/rewards/earnings", async (req, res) => {
  const rawRange = typeof req.query.range === "string" ? req.query.range : "all";
  if (!isEarningsRange(rawRange)) {
    res.status(400).json({
      error: "range must be today, this_week, last_7_days, this_month, or all",
    });
    return;
  }
  const tz =
    typeof req.query.tz === "string" && req.query.tz.trim()
      ? req.query.tz.trim()
      : "UTC";
  if (!isValidTimezone(tz)) {
    res.status(400).json({ error: "Invalid timezone" });
    return;
  }
  const limit = Number(req.query.limit);
  try {
    const { from, to } = resolveEarningsRangeBounds(rawRange, new Date(), tz);
    res.json(
      await getEarningsSnapshot(pool, {
        range: rawRange,
        from,
        to,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
    );
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Bad earnings range",
    });
  }
});

api.get("/rewards/rules", (_req, res) => {
  res.json(getRewardsRulesPayload());
});

api.get("/rewards/history", async (req, res) => {
  const rawRange = typeof req.query.range === "string" ? req.query.range : "all";
  if (!isEarningsRange(rawRange)) {
    res.status(400).json({
      error: "range must be today, this_week, last_7_days, this_month, or all",
    });
    return;
  }
  const tz =
    typeof req.query.tz === "string" && req.query.tz.trim()
      ? req.query.tz.trim()
      : "UTC";
  if (!isValidTimezone(tz)) {
    res.status(400).json({ error: "Invalid timezone" });
    return;
  }
  const limit = Number(req.query.limit);
  try {
    const { from, to } = resolveEarningsRangeBounds(rawRange, new Date(), tz);
    res.json(
      await getPullHistorySnapshot(pool, {
        range: rawRange,
        from,
        to,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
    );
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Bad history range",
    });
  }
});

api.post("/rewards/pull", async (req, res) => {
  const raw = (req.body as { count?: unknown })?.count;
  const count = raw === 10 || raw === "10" ? 10 : raw === 1 || raw === "1" ? 1 : null;
  if (count == null) {
    res.status(400).json({ error: "count must be 1 or 10" });
    return;
  }
  const result = await pullCatCakes(pool, count);
  if ("error" in result) {
    res.status(409).json(result);
    return;
  }
  res.json(result);
});

api.post("/rewards/refund", async (req, res) => {
  const body = req.body as { flavorId?: unknown; edition?: unknown };
  const flavorId = typeof body.flavorId === "string" ? body.flavorId : "";
  const edition = typeof body.edition === "string" ? body.edition : "";
  const result = await refundOneDuplicate(pool, flavorId, edition);
  if ("error" in result) {
    res.status(result.code === "unknown_variant" ? 400 : 409).json(result);
    return;
  }
  res.json(result);
});

api.post("/rewards/look", async (req, res) => {
  const body = req.body as { flavorId?: unknown; look?: unknown };
  const flavorId = typeof body.flavorId === "string" ? body.flavorId : "";
  const look = typeof body.look === "string" ? body.look : "";
  const result = await selectCeLook(pool, flavorId, look);
  if ("error" in result) {
    res.status(result.code === "night_locked" ? 409 : 400).json(result);
    return;
  }
  res.json(result);
});

api.get("/points/events", async (req, res) => {
  const limit = Number(req.query.limit);
  const offset = Number(req.query.offset);
  res.json({
    events: await listPointsEvents(pool, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    }),
  });
});

api.delete("/tasks/:id", async (req, res) => {
  const deleted = await deleteTask(pool, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true });
});

api.post("/tasks/:taskId/subtasks", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  try {
    const subtask = await createSubtask(pool, req.params.taskId, {
      title: body.title,
      dueAt: body.dueAt as string | null | undefined,
      dueKind: body.dueKind as "deadline" | "target" | null | undefined,
      estimateMinutes: body.estimateMinutes as number | null | undefined,
      priorityOverride: body.priorityOverride as 0 | 1 | 2 | null | undefined,
    });
    res.status(201).json(subtask);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const subtask = await patchSubtask(pool, req.params.taskId, req.params.subtaskId, {
      title: typeof body.title === "string" ? body.title : undefined,
      dueAt: body.dueAt as string | null | undefined,
      dueKind: body.dueKind as "deadline" | "target" | null | undefined,
      estimateMinutes: body.estimateMinutes as number | null | undefined,
      priorityOverride: body.priorityOverride as 0 | 1 | 2 | null | undefined,
    });
    if (!subtask) {
      res.status(404).json({ error: "Subtask not found" });
      return;
    }
    res.json(subtask);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:taskId/subtasks/:subtaskId/complete", async (req, res) => {
  try {
    const subtask = await completeSubtask(pool, req.params.taskId, req.params.subtaskId);
    if (!subtask) {
      res.status(404).json({ error: "Subtask not found or cannot complete" });
      return;
    }
    res.json(subtask);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:taskId/subtasks/:subtaskId/reopen", async (req, res) => {
  try {
    const subtask = await reopenSubtask(pool, req.params.taskId, req.params.subtaskId);
    if (!subtask) {
      res.status(404).json({ error: "Subtask not found or cannot reopen" });
      return;
    }
    res.json(subtask);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:taskId/subtasks/:subtaskId/move", async (req, res) => {
  const direction = (req.body as { direction?: unknown }).direction;
  if (direction !== "up" && direction !== "down") {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  try {
    const subtasks = await moveSubtask(pool, req.params.taskId, req.params.subtaskId, direction);
    if (!subtasks) {
      res.status(404).json({ error: "Subtask not found" });
      return;
    }
    res.json({ subtasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:taskId/subtasks/reorder", async (req, res) => {
  const orderedIds = (req.body as { orderedIds?: unknown }).orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) {
    res.status(400).json({ error: "orderedIds must be an array of strings" });
    return;
  }
  try {
    const subtasks = await reorderSubtasks(pool, req.params.taskId, orderedIds);
    if (!subtasks) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json({ subtasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/tasks/:taskId/subtasks/:subtaskId", async (req, res) => {
  try {
    const deleted = await deleteSubtask(pool, req.params.taskId, req.params.subtaskId);
    if (!deleted) {
      res.status(404).json({ error: "Subtask not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.get("/progress/today", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  res.json(await getProgressToday(pool, tz));
});

api.get("/progress/completions", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const rawKind = String(req.query.kind ?? "all");
  const allowed: Array<CompletionKind | "all"> = [
    "all",
    "task",
    "application",
    "interview",
    "reflection",
    "weekly",
    "leetcode",
  ];
  const kind = (allowed.includes(rawKind as CompletionKind | "all")
    ? rawKind
    : "all") as CompletionKind | "all";
  const limit = Number(req.query.limit);
  const endDateRaw = String(req.query.endDate ?? "");
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(endDateRaw) ? endDateRaw : undefined;
  const daysNum = Number(req.query.days);
  res.json(
    await getCompletionsDiary(pool, tz, {
      kind,
      limit: Number.isFinite(limit) ? limit : undefined,
      endDate,
      days: Number.isFinite(daysNum) ? daysNum : undefined,
    }),
  );
});

api.get("/progress/lifetime", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const activityDays = Number(req.query.activityDays);
  res.json(
    await getLifetimeSnapshot(pool, tz, {
      activityDays: Number.isFinite(activityDays) ? activityDays : undefined,
    }),
  );
});

api.get("/achievements", async (_req, res) => {
  try {
    res.json(await listAchievements(pool));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(500).json({ error: message });
  }
});

api.get("/weekly-goals", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const snapshot = await getWeeklyGoalsSnapshot(pool, tz);
  if (!snapshot) {
    res.status(400).json({ error: "Invalid timezone" });
    return;
  }
  res.json(snapshot);
});

api.patch("/weekly-goals/lc", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const body = req.body as {
    targetCount?: unknown;
    progressCount?: unknown;
    label?: unknown;
  };
  if (body.progressCount !== undefined) {
    res.status(400).json({
      error: "Weekly LC progress moves only by logging solves (PATCH /api/progress/leetcode)",
    });
    return;
  }
  const hasTarget = Object.prototype.hasOwnProperty.call(body, "targetCount");
  const hasLabel = Object.prototype.hasOwnProperty.call(body, "label");
  if (!hasTarget && !hasLabel) {
    res.status(400).json({ error: "Provide targetCount and/or label" });
    return;
  }
  if (hasTarget && typeof body.targetCount !== "number") {
    res.status(400).json({ error: "targetCount must be a number" });
    return;
  }
  if (hasLabel && body.label != null && typeof body.label !== "string") {
    res.status(400).json({ error: "label must be a string" });
    return;
  }
  try {
    const snapshot = await patchLcGoal(pool, tz, {
      ...(hasTarget ? { targetCount: body.targetCount as number } : {}),
      ...(hasLabel ? { label: body.label as string | null } : {}),
    });
    if (!snapshot) {
      res.status(400).json({ error: "Invalid timezone" });
      return;
    }
    res.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.put("/weekly-goals/apps/members/:taskId", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const body = req.body as { member?: unknown };
  if (typeof body.member !== "boolean") {
    res.status(400).json({ error: "member boolean required" });
    return;
  }
  try {
    const snapshot = await setAppTargetMembership(pool, tz, req.params.taskId, body.member);
    if (!snapshot) {
      res.status(400).json({ error: "Invalid timezone" });
      return;
    }
    res.json(snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      typeof (err as { status?: number }).status === "number"
        ? (err as { status: number }).status
        : 400;
    res.status(status).json({ error: message });
  }
});

api.get("/progress/heatmap", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const lane = String(req.query.lane ?? "application");
  if (!isProgressHeatmapLane(lane)) {
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
  const body = req.body as { tier?: unknown; delta?: unknown; type?: unknown; date?: unknown };
  if (!isLeetcodeTier(body.tier)) {
    res.status(400).json({ error: "tier must be easy, medium or hard" });
    return;
  }
  if (body.delta !== 1 && body.delta !== -1) {
    res.status(400).json({ error: "delta must be 1 or -1" });
    return;
  }
  if (body.type !== "weekly" && body.type !== "misc") {
    res.status(400).json({ error: "type must be weekly or misc" });
    return;
  }
  if (body.date !== undefined && typeof body.date !== "string") {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }
  try {
    res.json(
      await changeLeetcode(pool, tz, {
        tier: body.tier,
        delta: body.delta,
        type: body.type,
        date: body.date,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = (err as { status?: number }).status;
    res.status(status === 409 ? 409 : 400).json({ error: message });
  }
});

api.get("/progress/reflections/unlinked", async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 40;
  res.json({ reflections: await listUnlinkedReflections(pool, limit) });
});

api.post("/progress/reflections", async (req, res) => {
  const body = req.body as {
    lane?: string;
    body?: string;
    taskId?: string | null;
    applicationId?: string | null;
    interviewStepId?: string | null;
    localDate?: string | null;
    tz?: string | null;
    awardPoints?: boolean;
  };
  const lane = body.lane ?? "";
  if (!isProgressLane(lane)) {
    res.status(400).json({ error: "lane must be application, technical, or other" });
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
      taskId: body.taskId ?? null,
      applicationId: body.applicationId ?? null,
      interviewStepId: body.interviewStepId ?? null,
      localDate: body.localDate ?? null,
      tz: body.tz ?? (typeof req.query.tz === "string" ? req.query.tz : null),
      awardPoints: body.awardPoints,
    });
    res.status(201).json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      message === "Application not found" ||
      message === "Task not found" ||
      message === "Interview step not found for application"
        ? 404
        : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/progress/reflections/:id", async (req, res) => {
  const body = req.body as {
    body?: string;
    lane?: string;
    taskId?: string | null;
    applicationId?: string | null;
    interviewStepId?: string | null;
    clearLink?: boolean;
  };
  if (body.lane != null && !isProgressLane(body.lane)) {
    res.status(400).json({ error: "lane must be application, technical, or other" });
    return;
  }
  if (body.body !== undefined && (typeof body.body !== "string" || !body.body.trim())) {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const row = await updateReflectionLog(pool, req.params.id, {
      body: body.body,
      lane: body.lane as ProgressLane | undefined,
      taskId: body.taskId,
      applicationId: body.applicationId,
      interviewStepId: body.interviewStepId,
      clearLink: body.clearLink,
    });
    if (!row) {
      res.status(404).json({ error: "Reflection not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      message === "Application not found" ||
      message === "Task not found" ||
      message === "Interview step not found for application"
        ? 404
        : 400;
    res.status(status).json({ error: message });
  }
});

api.get("/tasks/:id/reflections", async (req, res) => {
  const task = await getTaskById(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ reflections: await listReflectionsForTask(pool, req.params.id) });
});

api.get("/applications/:id/reflections", async (req, res) => {
  const row = await getApplication(pool, req.params.id);
  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json({ reflections: await listReflectionsForApplication(pool, req.params.id) });
});

api.get("/applications/:id/interview-steps", async (req, res) => {
  try {
    const steps = await listInterviewStepsForApplication(pool, req.params.id);
    res.json({ steps });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message === "Application not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
}

export { APPLICATION_STATUSES };
