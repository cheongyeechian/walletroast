// lib/roast.ts
// Take extracted wallet stats and generate a roast via OpenAI.
// Returns structured JSON: verdict + roasts[] + highlight_stat.

import OpenAI from 'openai';
import type { RoastData } from './extract';

const client = new OpenAI(); // reads OPENAI_API_KEY from env

export interface Roast {
  verdict: string;          // one-line wallet personality
  roasts: string[];         // 4 specific roasts referencing real data
  highlight_stat: string;   // single funniest/saddest stat
}

const SYSTEM_PROMPT = `You are a witty roast writer for crypto traders. Tone: a sharp friend who knows them too well — observational, mildly mean, ultimately affectionate. Like a friend roasting you at brunch, NOT an internet troll.

You will receive structured wallet data. Write a roast based on REAL data only.

Output ONLY valid JSON in this exact shape:
{
  "verdict": "string, max 12 words",
  "roasts": ["string", "string", "string", "string"],
  "highlight_stat": "string, the single funniest or saddest stat"
}

RULES:
- Reference specific tokens, dates, USD amounts, dapp names from the data.
- Each roast 1-2 sentences max.
- NEVER give financial advice ("you should have bought X").
- NEVER reference identity, race, gender, politics.
- NEVER hallucinate data not provided.
- Use dapp names when available (Uniswap, Aave, Pendle, etc.) — these are gold for specific roasts.
- Round USD amounts (no $1247.83 — say $1.2K or $1,250).

EXAMPLES OF GOOD ROASTS:
- "53 transactions on Uniswap V3 alone. The Vitalik of slippage."
- "Lost $3.2K on $PEPE realized. Bold strategy, Cotton."
- "Held $LINK for 1,247 days. Patience or denial — hard to tell."
- "Gas spent: $890. Could have bought a Steam Deck."
- "Most-used dapp: Aave. The investment portfolio of someone who has read 'borrow against your bag' and meant it."

EXAMPLES OF BAD ROASTS:
- "You are dumb for buying PEPE" (mean, not funny)
- "DeFi is risky, be careful" (preachy)
- "You should HODL more" (advice)`;

export async function generateRoast(data: RoastData): Promise<Roast> {
  if (data.isEmpty) {
    return {
      verdict: 'Ghost wallet. Spectral degen energy.',
      roasts: [
        'Zero transactions, zero holdings, zero personality. Are you a federal agent?',
        'This wallet has the on-chain activity of a screenshot.',
        'You came, you connected, you left. Iconic minimalism.',
        "Even my dog's hypothetical wallet has more action than this.",
      ],
      highlight_stat: '0 transactions on chain. 0 of personality, too.',
    };
  }

  const userPrompt = `Roast this wallet. Real data:

Address: ${data.address.slice(0, 6)}...${data.address.slice(-4)}
Wallet age: ${data.walletAgeDays} days
Transactions analyzed: ${data.txCount}
Current portfolio value: $${data.totalValueUsd.toFixed(0)}
24h change: ${data.change24hPct.toFixed(1)}%

Top holdings:
${data.topHoldings.map((h) => `  - ${h.symbol} on ${h.chain}: $${h.value.toFixed(0)}`).join('\n') || '  (none)'}

Favorite dapps (by tx count):
${data.favoriteApps.map((a) => `  - ${a.name}: ${a.count} interactions`).join('\n') || '  (none)'}

Operation breakdown:
${Object.entries(data.operationBreakdown).map(([op, count]) => `  - ${op}: ${count}`).join('\n')}

Total gas spent: $${data.totalGasSpentUsd.toFixed(0)}

PnL summary:
  Realized gain: $${data.pnlSummary.realizedGain.toFixed(0)}
  Unrealized gain: $${data.pnlSummary.unrealizedGain.toFixed(0)}
  Net invested: $${data.pnlSummary.netInvested.toFixed(0)}
  Total fees: $${data.pnlSummary.totalFees.toFixed(0)}

Top token PnL:
${data.topTokenPnl.map((t) => `  - ${t.symbol}: realized $${t.realized.toFixed(0)}, unrealized $${t.unrealized.toFixed(0)} (${t.gainPct.toFixed(1)}%)`).join('\n') || '  (no significant PnL data)'}

${data.biggestSingleTx ? `Biggest single transfer: ${data.biggestSingleTx.type} of $${data.biggestSingleTx.usdValue.toFixed(0)} ${data.biggestSingleTx.symbol || ''} on ${data.biggestSingleTx.date.slice(0, 10)}` : ''}

Now write the roast. JSON only.`;

  // Model choice:
  //   - 'gpt-4o-mini'  → ~$0.0006/roast, fast, good enough
  //   - 'gpt-4o'       → ~$0.01/roast, best quality
  // Start with mini. Switch to 4o if roast quality feels weak after Day 1 testing.
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' }, // forces valid JSON output
    max_tokens: 1024,
    temperature: 0.9, // higher temp = funnier, more varied roasts
  });

  const text = response.choices[0]?.message?.content || '';

  try {
    return JSON.parse(text) as Roast;
  } catch (e) {
    console.error('Failed to parse OpenAI response:', text);
    throw new Error('AI response was not valid JSON');
  }
}
