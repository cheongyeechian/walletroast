import { NextRequest } from 'next/server';
import { extractRoastData } from '@/lib/extract';
import { generateRoast } from '@/lib/roast';
import { validateAddress, type Chain } from '@/lib/chain';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'anonymous';
}

export async function POST(req: NextRequest) {
  let body: { address?: string; chain?: Chain };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const address = body.address?.trim();
  const chain = body.chain;

  if (!address || !chain) {
    return Response.json({ error: 'address and chain are required' }, { status: 400 });
  }
  if (chain !== 'evm' && chain !== 'solana') {
    return Response.json({ error: 'chain must be evm or solana' }, { status: 400 });
  }
  if (!validateAddress(address, chain)) {
    const label = chain === 'evm' ? 'EVM (Ethereum / L2s)' : 'Solana';
    return Response.json(
      { error: `Address does not look like a valid ${label} address` },
      { status: 400 }
    );
  }

  const ip = getIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.success) {
    return Response.json(
      {
        error: 'Daily limit reached. Come back tomorrow.',
        remaining: rl.remaining,
        reset: rl.reset,
      },
      { status: 429 }
    );
  }

  try {
    const stats = await extractRoastData(address);
    const roast = await generateRoast(stats);
    return Response.json({
      stats,
      roast,
      chain,
      remaining: rl.remaining,
    });
  } catch (e: any) {
    console.error('[roast] failed:', e);
    return Response.json(
      { error: e?.message || 'Failed to roast wallet' },
      { status: 500 }
    );
  }
}
