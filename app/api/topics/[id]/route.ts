import { NextResponse } from "next/server";
import { assertTrustedRequest } from "@/app/api/_security/api-auth";
import { deleteTopic, updateTopic } from "@/lib/topics";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = assertTrustedRequest(req);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const body = await req.json() as { name?: string; sortOrder?: number };
    const topic = updateTopic(id, {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
    });
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ topic });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = assertTrustedRequest(req);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    if (!deleteTopic(id)) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
