import { NextResponse } from "next/server";
import { assertTrustedRequest } from "@/app/api/_security/api-auth";
import { assertTrustedWorkspace, normalizeWorkspacePath } from "@/app/api/_security/workspace-trust";
import { createTopic, getSessionTopicMap, listTopics } from "@/lib/topics";

export async function GET(req: Request) {
  const blocked = assertTrustedRequest(req);
  if (blocked) return blocked;

  try {
    const url = new URL(req.url);
    const cwdParam = url.searchParams.get("cwd");
    const cwd = cwdParam ? normalizeWorkspacePath(cwdParam) : undefined;
    const topics = listTopics(cwd);
    const topicIds = new Set(topics.map((topic) => topic.id));
    return NextResponse.json({ topics, sessionTopics: getSessionTopicMap(topicIds) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const blocked = assertTrustedRequest(req);
  if (blocked) return blocked;

  try {
    const body = await req.json() as { cwd?: string; name?: string };
    if (!body.cwd || typeof body.cwd !== "string") {
      return NextResponse.json({ error: "cwd is required" }, { status: 400 });
    }
    const cwd = normalizeWorkspacePath(body.cwd);
    const blockedWorkspace = assertTrustedWorkspace(cwd);
    if (blockedWorkspace) return blockedWorkspace;
    const topic = createTopic(cwd, typeof body.name === "string" ? body.name : "Untitled topic");
    return NextResponse.json({ topic });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
