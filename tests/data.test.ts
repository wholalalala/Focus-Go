import "fake-indexeddb/auto";
import { beforeEach, it, expect } from "vitest";
import {
  db,
  ChildRepository,
  SessionRepository,
  EventRepository,
  exportChild,
} from "../src/data/repositories";
import { createSession, appendEvent } from "../src/core/runtime";
beforeEach(async () => {
  await db.delete();
  await db.open();
});
it("persists children, sessions, append-only events and exports then deletes all child data", async () => {
  const child = {
    id: "a",
    nickname: "Test",
    birthYearMonth: "2020-01",
    preferredLanguage: "en" as const,
    readingLevel: "NONE" as const,
    optionalNotes: "",
    createdAt: "now",
    updatedAt: "now",
  };
  await ChildRepository.save(child);
  const session = createSession("a", "ASSESSMENT");
  await SessionRepository.save(session);
  await appendEvent(session, "SESSION_CREATED");
  const events = await EventRepository.forSession(session.id);
  expect(events).toHaveLength(1);
  await expect(EventRepository.append(events[0])).rejects.toThrow();
  const data = await exportChild("a");
  expect(data.format).toBe("focusgo-export-v1");
  expect(data.trials).toHaveLength(84);
  await ChildRepository.delete("a");
  expect(await db.children.count()).toBe(0);
  expect(await db.sessions.count()).toBe(0);
  expect(await db.events.count()).toBe(0);
});
