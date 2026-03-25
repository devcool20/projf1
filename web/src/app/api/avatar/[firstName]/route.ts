import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const AVATAR_DIR = path.join(process.cwd(), "avatar");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ firstName: string }> },
) {
  const { firstName } = await params;
  const sanitized = firstName.toLowerCase().replace(/[^a-z]/g, "");

  if (!sanitized) {
    return new NextResponse("Avatar not found", { status: 404 });
  }

  const filePath = path.join(AVATAR_DIR, `${sanitized}.mp4`);

  let fileSize = 0;
  try {
    const fileStat = await stat(filePath);
    fileSize = fileStat.size;
  } catch {
    return new NextResponse("Avatar not found", { status: 404 });
  }

  const range = req.headers.get("range");
  if (!range) {
    const stream = createReadStream(filePath);
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const rangeMatch = /bytes=(\d*)-(\d*)/.exec(range);
  if (!rangeMatch) {
    return new NextResponse("Invalid Range header", { status: 416 });
  }

  const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
  const end = rangeMatch[2] ? Number(rangeMatch[2]) : fileSize - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return new NextResponse("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }

  const chunkEnd = Math.min(end, fileSize - 1);
  const chunkSize = chunkEnd - start + 1;
  const stream = createReadStream(filePath, { start, end: chunkEnd });

  return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${chunkEnd}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
