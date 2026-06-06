import { NextResponse } from "next/server";
import { assertTrustedRequest } from "@/app/api/_security/api-auth";
import { normalizeWorkspacePath } from "@/app/api/_security/workspace-trust";
import { statSync } from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = assertTrustedRequest(req);
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as { cwd?: unknown };
    const cwd = typeof body.cwd === "string" ? body.cwd.trim() : "";

    if (!cwd) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const normalizedCwd = normalizeWorkspacePath(cwd);
    let stat;
    try {
      stat = statSync(normalizedCwd);
    } catch {
      return NextResponse.json({ error: `Directory does not exist: ${cwd}` }, { status: 400 });
    }

    if (!stat.isDirectory()) {
      return NextResponse.json({ error: `Path is not a directory: ${cwd}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, cwd: normalizedCwd });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
