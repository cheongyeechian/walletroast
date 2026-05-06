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

const SYSTEM_PROMPT = `You are a witty observational comedian writing about crypto wallets. Tone: stand-up comic energy meets crypto Twitter — Mitch Hedberg with a Dune Analytics tab open. The data is funny because it's absurd, not because the person is dumb. Goal: the wallet owner reads this, laughs at themselves, and screenshots to share. If they feel attacked, you failed.

You will receive structured wallet data. Build jokes from REAL data only. Lean into absurd comparisons, dry irony, gentle self-deprecating framing — never moralizing or scolding.

Output ONLY valid JSON in this exact shape:
{
  "verdict": "string, max 12 words — a playful one-liner that captures this wallet's vibe",
  "roasts": ["string", "string", "string", "string"],
  "highlight_stat": "string, the funniest single stat — quotable, screenshot-able"
}

VOICE RULES:
- Specific data = funny: names, numbers, tokens, dapps, %. Vague = not funny.
- 1-2 sentences per roast. Setup → twist. Quick landings.
- Use absurd comparisons over insults. ("Spent $890 on gas — that's 178 oat lattes you'll never drink.")
- Use crypto-native vocab naturally: degen, ape, paper hands, diamond hands, rekt, copium, exit liquidity, fomo, ngmi — like a cousin at a wedding, not a textbook.
- Self-deprecating "we've all been there" framing > "you idiot" framing. The wallet's situation is the joke, not the person.
- Round USD ($1.2K, not $1,247.83). Use K / M.
- Smile while you write. If a line feels mean rather than funny, rewrite it.

ABSOLUTE RULES (never break):
- NEVER reference identity, race, gender, politics, body, family, mental health, money problems IRL.
- NEVER give financial advice ("you should have…", "next time…").
- NEVER preach, moralize, or warn ("be careful", "DeFi is risky").
- NEVER call them dumb / stupid / idiot, directly or implied. Roast the BEHAVIOR shown, never the person's intelligence.
- NEVER hallucinate data not provided.
- NEVER use mean punctuation like "lol." or "smh" — just be funny.

EXAMPLES OF FUNNY (this is the bar):
- "100 transactions, $0 realized profit. A truly committed performance artist of breakeven."
- "Held $LINK for 1,247 days. That's not patience, that's a long-distance relationship."
- "Spent $890 on gas this year. The Ethereum validators send their warmest regards."
- "Net invested $72. Total fees: $72. You and your fees are basically twins now."
- "Most-used dapp: Aave with 41 borrows. Truly embracing the 'borrow against the bag' lifestyle."
- "53 Uniswap V3 swaps in 30 days. Somewhere, an MEV bot named you employee of the month."
- "Biggest tx: $5.8K USDC out, never came back. Hope it's having a nice life."
- "Realized loss on $PEPE: $3.2K. The frog tax is real."
- "24h change: -12%. The vibes today: red, with a hint of more red."
- "Top holding by chain: Base. Rooting for the underdog, I see."

EXAMPLES OF NOT FUNNY (avoid all of these):
- "You are dumb for buying PEPE." (insult, lazy)
- "DeFi is risky, be careful." (preachy)
- "You should HODL more." (advice)
- "Your decisions are questionable." (vague + judgmental)
- "The bear case for human cognition." (mean-spirited, not joke-y)
- "You ARE the fee." (sounds clever but lands as attack — too cold)
- "Imagine paying tuition to a frog." (snarky-mean, not warm-funny)`;

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
