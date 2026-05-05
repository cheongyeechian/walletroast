// lib/extract.ts
// Turn raw Zerion responses into a clean, roast-ready set of stats.
// This is what gets passed to Claude. The cleaner this is, the better the roast.

import { fetchPortfolio, fetchPositions, fetchTransactions, fetchPnL } from './zerion';

export interface RoastData {
  address: string;
  walletAgeDays: number;
  txCount: number;
  totalValueUsd: number;
  change24hPct: number;
  topHoldings: { symbol: string; value: number; chain: string }[];
  favoriteApps: { name: string; count: number }[];
  totalGasSpentUsd: number;
  operationBreakdown: Record<string, number>; // trade: 50, deposit: 12, ...
  biggestSingleTx: { type: string; usdValue: number; symbol?: string; date: string } | null;
  pnlSummary: {
    realizedGain: number;
    unrealizedGain: number;
    netInvested: number;
    totalFees: number;
  };
  topTokenPnl: { symbol: string; realized: number; unrealized: number; gainPct: number }[];
  isEmpty: boolean; // true if wallet has nothing useful to roast
}

export async function extractRoastData(address: string): Promise<RoastData> {
  // Fire all 3 base requests in parallel
  const [portfolio, positions, transactions] = await Promise.all([
    fetchPortfolio(address),
    fetchPositions(address),
    fetchTransactions(address, 100),
  ]);

  // Empty wallet check — bail early
  if (portfolio.total.positions === 0 && transactions.length === 0) {
    return emptyRoastData(address);
  }

  // ---------- Wallet age ----------
  const oldestTx = transactions[transactions.length - 1];
  const oldestDate = oldestTx ? new Date(oldestTx.attributes.mined_at) : new Date();
  const walletAgeDays = Math.floor(
    (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // ---------- Top holdings (top 5 by value) ----------
  const topHoldings = positions.slice(0, 5).map((p: any) => ({
    symbol: p.attributes.fungible_info?.symbol || 'UNKNOWN',
    value: p.attributes.value || 0,
    chain: p.relationships.chain.data.id,
  }));

  // ---------- Favorite apps (count application_metadata.name) ----------
  const appCounts: Record<string, number> = {};
  for (const tx of transactions) {
    const appName = tx.attributes.application_metadata?.name;
    if (appName) appCounts[appName] = (appCounts[appName] || 0) + 1;
  }
  const favoriteApps = Object.entries(appCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ---------- Total gas spent ----------
  const totalGasSpentUsd = transactions.reduce(
    (sum: number, tx: any) => sum + (tx.attributes.fee?.value || 0),
    0
  );

  // ---------- Operation type breakdown ----------
  const operationBreakdown: Record<string, number> = {};
  for (const tx of transactions) {
    const op = tx.attributes.operation_type;
    operationBreakdown[op] = (operationBreakdown[op] || 0) + 1;
  }

  // ---------- Biggest single transaction by USD value ----------
  let biggestSingleTx: RoastData['biggestSingleTx'] = null;
  for (const tx of transactions) {
    for (const transfer of tx.attributes.transfers || []) {
      const v = transfer.value || 0;
      if (!biggestSingleTx || v > biggestSingleTx.usdValue) {
        biggestSingleTx = {
          type: tx.attributes.operation_type,
          usdValue: v,
          symbol: transfer.fungible_info?.symbol,
          date: tx.attributes.mined_at,
        };
      }
    }
  }

  // ---------- PnL ----------
  // Get top 5 holdings' token IDs for per-token PnL
  // Note: Zerion needs fungible_ids like 'eth', 'usdc' — these come from positions
  const topTokenIds: string[] = positions
    .slice(0, 10)
    .map((p: any) => p.relationships?.fungible?.data?.id)
    .filter(Boolean);

  let pnlData: any = null;
  try {
    pnlData = await fetchPnL(address);
  } catch (e) {
    console.warn('PnL fetch failed, continuing without:', e);
  }

  let topTokenPnl: RoastData['topTokenPnl'] = [];
  if (topTokenIds.length > 0) {
    try {
      const pnlBreakdown = await fetchPnL(address, topTokenIds);
      const breakdown = pnlBreakdown.breakdown?.by_id || {};
      topTokenPnl = Object.entries(breakdown)
        .map(([id, stats]: [string, any]) => ({
          symbol: id.toUpperCase(),
          realized: stats.realized_gain || 0,
          unrealized: stats.unrealized_gain || 0,
          gainPct: stats.relative_total_gain_percentage || 0,
        }))
        .sort((a, b) => Math.abs(b.realized) + Math.abs(b.unrealized) - Math.abs(a.realized) - Math.abs(a.unrealized))
        .slice(0, 5);
    } catch (e) {
      console.warn('Per-token PnL failed, continuing:', e);
    }
  }

  return {
    address,
    walletAgeDays,
    txCount: transactions.length,
    totalValueUsd: portfolio.total?.positions || 0,
    change24hPct: (portfolio.changes?.percent_1d || 0) * 100,
    topHoldings,
    favoriteApps,
    totalGasSpentUsd,
    operationBreakdown,
    biggestSingleTx,
    pnlSummary: {
      realizedGain: pnlData?.realized_gain || 0,
      unrealizedGain: pnlData?.unrealized_gain || 0,
      netInvested: pnlData?.net_invested || 0,
      totalFees: pnlData?.total_fee || 0,
    },
    topTokenPnl,
    isEmpty: false,
  };
}

function emptyRoastData(address: string): RoastData {
  return {
    address,
    walletAgeDays: 0,
    txCount: 0,
    totalValueUsd: 0,
    change24hPct: 0,
    topHoldings: [],
    favoriteApps: [],
    totalGasSpentUsd: 0,
    operationBreakdown: {},
    biggestSingleTx: null,
    pnlSummary: { realizedGain: 0, unrealizedGain: 0, netInvested: 0, totalFees: 0 },
    topTokenPnl: [],
    isEmpty: true,
  };
}
