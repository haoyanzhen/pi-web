import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { assertTrustedRequest } from "@/app/api/_security/api-auth";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function encodeContentDispositionFilename(fileName: string): string {
  const fallback = fileName.replace(/["\\\r\n]/g, "_") || "download";
  const encoded = encodeURIComponent(fileName).replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function createFileBodyStream(filePath: string): ReadableStream<Uint8Array> {
  const fileStream = fs.createReadStream(filePath);
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      fileStream.on("data", (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          closed = true;
          fileStream.destroy();
        }
      });
      fileStream.once("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // The browser may cancel the download before the stream finishes.
        }
      });
      fileStream.once("error", (error) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(error);
        } catch {
          // The response was already abandoned by the client.
        }
      });
    },
    cancel() {
      closed = true;
      fileStream.destroy();
    },
  });
}

export async function GET(request: NextRequest) {
  const blocked = assertTrustedRequest(request);
  if (blocked) return blocked;

  const cwd = request.nextUrl.searchParams.get("cwd");
  const relativePath = request.nextUrl.searchParams.get("path");

  if (!cwd || !relativePath) {
    return NextResponse.json({ error: "Missing cwd or path" }, { status: 400 });
  }
  if (path.isAbsolute(relativePath)) {
    return NextResponse.json({ error: "Path must be relative to cwd" }, { status: 400 });
  }

  try {
    const root = fs.realpathSync(cwd);
    const candidate = path.resolve(root, relativePath);
    const target = fs.realpathSync(candidate);

    if (!isInsideRoot(root, target)) {
      return NextResponse.json({ error: "Path is outside the current working directory" }, { status: 403 });
    }

    const stat = fs.statSync(target);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Only regular files can be downloaded" }, { status: 400 });
    }
    if (stat.size > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json({ error: "File too large for download (>100MB)" }, { status: 413 });
    }

    const fileName = path.basename(target);
    return new Response(createFileBodyStream(target), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": encodeContentDispositionFilename(fileName),
        "Content-Length": String(stat.size),
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
