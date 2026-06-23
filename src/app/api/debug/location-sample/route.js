import { NextResponse } from 'next/server';
import { requireAdminRequest } from '../../../lib/admin-auth';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const location = await prisma.location.findFirst();

    if (!location) {
      return NextResponse.json({
        ok: false,
        error: 'No locations found',
      });
    }

    const content = [
      location.title,
      location.accent,
      location.intro,
      location.address,
      location.parkingDescription,
    ]
      .filter(Boolean)
      .join(' ');

    return NextResponse.json({
      ok: true,
      location: {
        id: location.id,
        title: location.title,
        accent: location.accent,
        intro: location.intro,
        address: location.address,
        parkingDescription: location.parkingDescription,
      },
      contentLength: content.length,
      contentPreview: content.substring(0, 200),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
