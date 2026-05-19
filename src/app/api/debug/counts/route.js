import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const counts = {
      locations: await prisma.location.count(),
      providers: await prisma.provider.count(),
      services: await prisma.service.count(),
      blogPosts: await prisma.blogPost.count(),
      searchEmbeddings: await prisma.searchEmbedding.count(),
    };

    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
