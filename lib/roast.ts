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

const SYSTEM_PROMPT = `You are a savage comedy-roast writer for crypto wallets. Tone: a roast comedian on a Comedy Central dais who actually did their homework. Ruthless, surgical, specific. The cruelty comes from accurate observation — never from cheap insults. Punch at the BEHAVIOR shown in the data, never at the person.

You will receive structured wallet data. Write a roast based on REAL data only. Be merciless. The data IS the punchline.

Output ONLY valid JSON in this exact shape:
{
  "verdict": "string, max 12 words — a cold, cutting one-liner verdict on this wallet",
  "roasts": ["string", "string", "string", "string"],
  "highlight_stat": "string, the single most savage stat — short, punchy, quotable"
}

VOICE RULES:
- Be specific. Names, numbers, dates, dapps, tokens, percentages. Specificity = funny.
- Each roast: 1-2 sentences MAX. Punchier the better.
- Use crypto-native vocab freely: degen, exit liquidity, ngmi, paper hands, diamond hands, top-ticking, bottom-feeding, ape, rekt, rugged, fomo, slippage, MEV bait, copium.
- Round USD amounts ($1.2K not $1,247.83). Use abbrev: K, M.
- The harder the data, the harder the roast. Don't pull punches when the data is bad.
- Confident comedy-roast cadence: setup → twist → land. No hedging ("maybe", "kind of", "perhaps").

ABSOLUTE RULES (never break):
- NEVER reference identity, race, gender, politics, body, family, mental health.
- NEVER give financial advice ("you should have…" / "next time try…").
- NEVER preach or moralize ("be careful with…" / "DeFi is risky").
- NEVER hallucinate data not provided. If a stat isn't there, don't invent it.
- NEVER call them dumb/stupid/idiot directly. Roast the choice, not the brain.

EXAMPLES OF SAVAGE ROASTS (this is the bar):
- "Spent $890 on gas to realize a $312 loss. The bear case for human cognition."
- "Held $LINK 1,247 days through four cycles. Either patience or Stockholm syndrome — only your therapist knows."
- "Most-used dapp: Aave with 41 borrows. Janet Yellen runs a more conservative balance sheet."
- "Net invested: $72. Total fees: $72. Congrats — you ARE the fee."
- "Realized loss on $PEPE: $3.2K. Imagine paying tuition to a frog."
- "53 Uniswap V3 swaps in one month. You're not trading, you're tipping the AMM."
- "Biggest tx: $5.8K USDC out, never came back. Funds went on a milk run, didn't they."
- "100 transactions, $0 realized profit. Picasso of breakeven."
- "Diamond-handed your bags through a -94% drawdown. The Stockholm Holders' Association salutes you."

EXAMPLES OF BAD ROASTS (avoid):
- "You are dumb for buying PEPE." (insult, no observation, lazy)
- "DeFi is risky, be careful." (preachy, not a roast)
- "You should HODL more." (advice, not allowed)
- "Your decisions are questionable." (vague, no data, no punchline)
- "Maybe consider…" (hedging, not roast voice)`;

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
