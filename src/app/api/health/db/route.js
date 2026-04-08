import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const blogPostCount = await prisma.blogPost.count();
  return NextResponse.json({ ok: true, blogPostCount });
}
