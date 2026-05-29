import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { getAgentDir } from "./session-reader";
import type { TopicInfo, TopicStore } from "./types";

const STORE_VERSION = 1;

function topicStorePath(): string {
  return join(getAgentDir(), "pi-web-topics.json");
}

function emptyStore(): TopicStore {
  return { version: STORE_VERSION, topics: [], sessionTopics: {} };
}

function sanitizeStore(raw: Partial<TopicStore>): TopicStore {
  const topics = Array.isArray(raw.topics)
    ? raw.topics.filter((topic): topic is TopicInfo => (
        typeof topic?.id === "string" &&
        typeof topic.cwd === "string" &&
        typeof topic.name === "string" &&
        typeof topic.created === "string" &&
        typeof topic.updated === "string" &&
        typeof topic.sortOrder === "number"
      ))
    : [];

  const topicIds = new Set(topics.map((topic) => topic.id));
  const sessionTopics: Record<string, string> = {};
  if (raw.sessionTopics && typeof raw.sessionTopics === "object") {
    for (const [sessionId, topicId] of Object.entries(raw.sessionTopics)) {
      if (typeof sessionId === "string" && typeof topicId === "string" && topicIds.has(topicId)) {
        sessionTopics[sessionId] = topicId;
      }
    }
  }

  return { version: STORE_VERSION, topics, sessionTopics };
}

export function readTopicStore(): TopicStore {
  const filePath = topicStorePath();
  if (!existsSync(filePath)) return emptyStore();
  try {
    return sanitizeStore(JSON.parse(readFileSync(filePath, "utf8")) as Partial<TopicStore>);
  } catch {
    return emptyStore();
  }
}

function writeTopicStore(store: TopicStore): void {
  const filePath = topicStorePath();
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(store, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
}

function sortTopics(topics: TopicInfo[]): TopicInfo[] {
  return [...topics].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.created.localeCompare(b.created);
  });
}

export function listTopics(cwd?: string): TopicInfo[] {
  const store = readTopicStore();
  const topics = cwd ? store.topics.filter((topic) => topic.cwd === cwd) : store.topics;
  return sortTopics(topics);
}

export function getSessionTopicMap(topicIds?: Set<string>): Record<string, string> {
  const store = readTopicStore();
  if (!topicIds) return store.sessionTopics;
  return Object.fromEntries(
    Object.entries(store.sessionTopics).filter(([, topicId]) => topicIds.has(topicId))
  );
}

export function createTopic(cwd: string, name: string): TopicInfo {
  const store = readTopicStore();
  const now = new Date().toISOString();
  const maxSortOrder = store.topics
    .filter((topic) => topic.cwd === cwd)
    .reduce((max, topic) => Math.max(max, topic.sortOrder), -1);
  const topic: TopicInfo = {
    id: randomUUID(),
    cwd,
    name: name.trim() || "Untitled topic",
    created: now,
    updated: now,
    sortOrder: maxSortOrder + 1,
  };
  store.topics.push(topic);
  writeTopicStore(store);
  return topic;
}

export function updateTopic(id: string, updates: { name?: string; sortOrder?: number }): TopicInfo | null {
  const store = readTopicStore();
  const topic = store.topics.find((item) => item.id === id);
  if (!topic) return null;
  if (updates.name !== undefined) topic.name = updates.name.trim() || "Untitled topic";
  if (updates.sortOrder !== undefined && Number.isFinite(updates.sortOrder)) topic.sortOrder = updates.sortOrder;
  topic.updated = new Date().toISOString();
  writeTopicStore(store);
  return topic;
}

export function deleteTopic(id: string): boolean {
  const store = readTopicStore();
  const before = store.topics.length;
  store.topics = store.topics.filter((topic) => topic.id !== id);
  if (store.topics.length === before) return false;
  for (const [sessionId, topicId] of Object.entries(store.sessionTopics)) {
    if (topicId === id) delete store.sessionTopics[sessionId];
  }
  writeTopicStore(store);
  return true;
}

export function setSessionTopic(sessionId: string, topicId: string | null): void {
  const store = readTopicStore();
  if (topicId === null) {
    delete store.sessionTopics[sessionId];
    writeTopicStore(store);
    return;
  }
  if (!store.topics.some((topic) => topic.id === topicId)) {
    throw new Error("Topic not found");
  }
  store.sessionTopics[sessionId] = topicId;
  writeTopicStore(store);
}

export function clearSessionTopic(sessionId: string): void {
  const store = readTopicStore();
  if (!(sessionId in store.sessionTopics)) return;
  delete store.sessionTopics[sessionId];
  writeTopicStore(store);
}
