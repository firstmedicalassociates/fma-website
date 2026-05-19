import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: 'text field required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Requesting embedding for:', text.substring(0, 50));

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    console.log('Embedding response:', response.data[0] ? 'Success' : 'No data');

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
