import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spec, resultText } = body;

    if (!spec || !resultText) {
      return NextResponse.json(
        { error: 'Missing required fields: spec, resultText' },
        { status: 400 }
      );
    }

    const verifierUrl = process.env.VERIFIER_URL || 'http://localhost:3001';

    console.log(`Calling verifier service at ${verifierUrl}/score...`);

    const response = await fetch(`${verifierUrl}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        specification: spec,
        deliverable: resultText
      })
    });

    if (!response.ok) {
      throw new Error(`Verifier service returned ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      score: result.score,
      rationale: result.rationale || result.reasoning || 'No rationale provided'
    });
  } catch (error: any) {
    console.error('Verify task error:', error);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return NextResponse.json({
        score: 75,
        rationale: 'Verifier service unavailable. Using fallback score of 75 for demo purposes.',
        fallback: true
      });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to verify task' },
      { status: 500 }
    );
  }
}
