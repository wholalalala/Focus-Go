import Dexie, { type Table } from "dexie";
import type {
  Child,
  Session,
  FocusGoEvent,
  ContentArtifact,
  TrainingPlan,
} from "../core/types";
class FocusGoDB extends Dexie {
  children!: Table<Child, string>;
  sessions!: Table<Session, string>;
  events!: Table<FocusGoEvent, string>;
  artifacts!: Table<ContentArtifact, string>;
  plans!: Table<TrainingPlan, string>;
  constructor() {
    super("focusgo-v1");
    this.version(1).stores({
      children: "id",
      sessions: "id,childId,status",
      events: "id,sessionId",
      artifacts: "id,childId,cacheKey",
      plans: "id,childId",
    });
  }
}
export const db = new FocusGoDB();
export const ChildRepository = {
  all: () => db.children.toArray(),
  save: (child: Child) => db.children.put(child),
  async delete(id: string) {
    await db.transaction(
      "rw",
      [db.children, db.sessions, db.events, db.artifacts, db.plans],
      async () => {
        const sessions = await db.sessions
          .where("childId")
          .equals(id)
          .toArray();
        await db.events
          .where("sessionId")
          .anyOf(sessions.map((s) => s.id))
          .delete();
        await db.sessions.where("childId").equals(id).delete();
        await db.artifacts.where("childId").equals(id).delete();
        await db.plans.where("childId").equals(id).delete();
        await db.children.delete(id);
      },
    );
  },
};
export const SessionRepository = {
  save: (s: Session) => db.sessions.put(s),
  get: (id: string) => db.sessions.get(id),
  forChild: (id: string) =>
    db.sessions.where("childId").equals(id).sortBy("createdAt"),
};
export const AssessmentRepository = {
  async forChild(id: string) {
    return (await SessionRepository.forChild(id)).filter(
      (s) => s.mode === "ASSESSMENT",
    );
  },
};
export const EventRepository = {
  append: (e: FocusGoEvent) => db.events.add(e),
  forSession: (id: string) => db.events.where("sessionId").equals(id).toArray(),
};
export const AIArtifactRepository = {
  save: (a: ContentArtifact) => db.artifacts.add(a),
  find: (key: string, childId: string) =>
    db.artifacts
      .where("cacheKey")
      .equals(key)
      .and((a) => a.childId === childId)
      .first(),
};
export const PlanRepository = {
  save: (p: TrainingPlan) => db.plans.put(p),
  forChild: (id: string) => db.plans.where("childId").equals(id).first(),
};
export async function exportChild(id: string) {
  const sessions = await SessionRepository.forChild(id);
  return {
    format: "focusgo-export-v1",
    appVersion: "0.1.0",
    exportedAt: new Date().toISOString(),
    profile: await db.children.get(id),
    assessments: sessions.filter((s) => s.mode === "ASSESSMENT"),
    baseline: sessions.find((s) => s.baselineType === "PERSONAL_BASELINE"),
    baselines: sessions.filter((s) => s.baselineType === "PERSONAL_BASELINE"),
    sessions,
    taskRuns: sessions.flatMap((s) => s.taskRuns),
    trials: sessions.flatMap((s) => s.taskRuns.flatMap((r) => r.trials)),
    events: await db.events
      .where("sessionId")
      .anyOf(sessions.map((s) => s.id))
      .toArray(),
    metrics: sessions.flatMap((s) =>
      s.taskRuns.map((r) => ({ taskRunId: r.id, metrics: r.metrics })),
    ),
    findings: sessions.flatMap((s) => s.taskRuns.flatMap((r) => r.findings)),
    aiInvocations: sessions.flatMap((s) => s.invocations),
    reports: sessions.map((s) => s.reports),
    artifacts: await db.artifacts.where("childId").equals(id).toArray(),
    plans: await db.plans.where("childId").equals(id).toArray(),
  };
}
