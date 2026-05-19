import { NextResponse } from 'next/server';
import { runAiSearch } from '../../lib/ai-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const result = await runAiSearch(query, { limit: 8 });
    const status = result.ok ? 200 : result.error === 'Query must be at least 2 characters' ? 400 : 500;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('AI Search error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to process AI search',
      },
      { status: 500 }
    );
  }
}
