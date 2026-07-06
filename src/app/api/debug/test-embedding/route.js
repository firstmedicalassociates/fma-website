import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { requireAdminRequest } from '../../../lib/admin-auth';
import {
  getNoPhiError,
  hasPotentialPhi,
  normalizePublicSearchQuery,
} from '../../../lib/no-phi-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  }

  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const { text } = await request.json();
    const input = normalizePublicSearchQuery(text).slice(0, 2000);

    if (!input) {
      return NextResponse.json(
        { ok: false, error: 'text field required' },
        { status: 400 }
      );
    }

    if (hasPotentialPhi(input)) {
      return NextResponse.json(
        { ok: false, error: getNoPhiError('embedding diagnostics') },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'OPENAI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });

    return NextResponse.json({
      ok: true,
      embedding: response.data[0]?.embedding ? 'Generated' : 'Failed',
      dimensionality: response.data[0]?.embedding?.length || 0,
    });
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
