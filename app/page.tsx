'use client';

import { useState } from 'react';
import type { Chain } from '@/lib/chain';
import type { RoastData } from '@/lib/extract';
import type { Roast } from '@/lib/roast';

type ApiResponse = {
  stats: RoastData;
  roast: Roast;
  chain: Chain;
  remaining?: number;
};

export default function Page() {
  const [chain, setChain] = useState<Chain>('evm');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: address.trim(), chain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed: ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setAddress('');
  }

  return (
    <main className="flex-1 w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Header />
        {!result ? (
          <InputCard
            chain={chain}
            setChain={setChain}
            address={address}
            setAddress={setAddress}
            loading={loading}
            error={error}
            onSubmit={submit}
          />
        ) : (
          <Dashboard data={result} onReset={reset} />
        )}
        <Footer />
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="text-center mb-10 sm:mb-14">
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
        <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
          Wallet Roast
        </span>
      </h1>
      <p className="mt-3 text-base sm:text-lg text-zinc-400">
        Paste a wallet. Get roasted by your own on-chain history.
      </p>
    </div>
  );
}

function InputCard(props: {
  chain: Chain;
  setChain: (c: Chain) => void;
  address: string;
  setAddress: (s: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { chain, setChain, address, setAddress, loading, error, onSubmit } = props;
  const placeholder =
    chain === 'evm'
      ? '0x47....dD45'
      : '5xLZ...PjF8 (Solana base58 address)';

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 backdrop-blur">
        <div className="flex gap-2 mb-4 p-1 bg-zinc-950 rounded-xl border border-zinc-800 w-fit">
          <ChainPill active={chain === 'evm'} onClick={() => setChain('evm')}>
            EVM
          </ChainPill>
          <ChainPill active={chain === 'solana'} onClick={() => setChain('solana')}>
            Solana
          </ChainPill>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          {chain === 'evm'
            ? 'Covers Ethereum, Arbitrum, Base, Polygon, Optimism, Avalanche, BSC + 30 more.'
            : 'Solana mainnet wallets.'}
        </p>

        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-sm sm:text-base outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition"
        />

        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition"
        >
          {loading ? 'Cooking the roast…' : 'Roast me'}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-zinc-500 text-center">
          3 roasts per day. Read-only. No wallet connection needed.
        </p>
      </div>
    </form>
  );
}

function ChainPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
        active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function Dashboard({ data, onReset }: { data: ApiResponse; onReset: () => void }) {
  const { stats, roast, chain } = data;
  const shortAddr = `${stats.address.slice(0, 6)}…${stats.address.slice(-4)}`;

  function tweet() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams({
      addr: stats.address,
      v: roast.verdict,
      s: roast.highlight_stat,
      d: String(stats.walletAgeDays),
      t: String(stats.txCount),
      p: formatCompact(stats.totalValueUsd),
    });
    const shareUrl = `${window.location.origin}/share?${params.toString()}`;
    const text = `I just got roasted by my wallet 😅\n\n"${roast.verdict}"`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-zinc-900/40 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2 font-mono">
          <ChainBadge chain={chain} />
          <span>{shortAddr}</span>
        </div>
        <p className="text-2xl sm:text-4xl font-black leading-tight">
          &ldquo;{roast.verdict}&rdquo;
        </p>
        <p className="mt-3 text-zinc-400 text-sm sm:text-base">
          Wallet age <span className="text-white font-semibold">{stats.walletAgeDays}d</span> · {stats.txCount} txs analyzed · ${formatCompact(stats.totalValueUsd)} portfolio
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        {roast.roasts.map((r, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-zinc-100 leading-relaxed"
          >
            <div className="text-orange-400 font-mono text-xs mb-2">#{i + 1}</div>
            {r}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-6 sm:p-8 text-center">
        <div className="text-orange-400 text-xs uppercase tracking-widest mb-2 font-bold">
          Highlight stat
        </div>
        <p className="text-xl sm:text-2xl font-bold">{roast.highlight_stat}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold">
          Wallet activity
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Portfolio"
            value={`$${formatCompact(stats.totalValueUsd)}`}
            sub={`${stats.change24hPct >= 0 ? '+' : ''}${stats.change24hPct.toFixed(1)}% 24h`}
            subTone={stats.change24hPct >= 0 ? 'up' : 'down'}
          />
          <Stat label="Transactions" value={String(stats.txCount)} sub={`${stats.walletAgeDays}d wallet`} />
          <Stat label="Gas burned" value={`$${formatCompact(stats.totalGasSpentUsd)}`} sub="all time" />
          <Stat
            label="Realized PnL"
            value={`${stats.pnlSummary.realizedGain >= 0 ? '+' : '-'}$${formatCompact(Math.abs(stats.pnlSummary.realizedGain))}`}
            sub={`Net invested $${formatCompact(stats.pnlSummary.netInvested)}`}
            subTone={stats.pnlSummary.realizedGain >= 0 ? 'up' : 'down'}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Panel title="Top holdings">
            {stats.topHoldings.length === 0 ? (
              <Empty>No holdings</Empty>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {stats.topHoldings.map((h, i) => (
                  <li key={i} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-semibold truncate">{h.symbol}</span>
                      <span className="text-xs text-zinc-500 truncate">{h.chain}</span>
                    </div>
                    <span className="font-mono text-sm shrink-0 ml-2">${formatCompact(h.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Favorite dapps">
            {stats.favoriteApps.length === 0 ? (
              <Empty>No dapp interactions detected</Empty>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {stats.favoriteApps.map((a, i) => (
                  <li key={i} className="py-2 flex items-center justify-between">
                    <span className="truncate">{a.name}</span>
                    <span className="font-mono text-sm text-zinc-400 shrink-0 ml-2">
                      {a.count} {a.count === 1 ? 'tx' : 'txs'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Operation breakdown">
            {Object.keys(stats.operationBreakdown).length === 0 ? (
              <Empty>No operations</Empty>
            ) : (
              <ul className="space-y-2">
                {Object.entries(stats.operationBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([op, count]) => {
                    const total = Object.values(stats.operationBreakdown).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <li key={op}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize">{op}</span>
                          <span className="font-mono text-zinc-400">{count}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Panel>

          <Panel title="Top token PnL">
            {stats.topTokenPnl.length === 0 ? (
              <Empty>No PnL data</Empty>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {stats.topTokenPnl.map((t, i) => {
                  const total = t.realized + t.unrealized;
                  const positive = total >= 0;
                  return (
                    <li key={i} className="py-2 flex items-center justify-between">
                      <span className="font-mono font-semibold">{t.symbol}</span>
                      <div className="text-right">
                        <div className={`font-mono text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : '-'}${formatCompact(Math.abs(total))}
                        </div>
                        <div className="text-xs text-zinc-500">{t.gainPct.toFixed(1)}%</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {stats.biggestSingleTx && (
          <Panel title="Biggest single transfer">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="text-2xl sm:text-3xl font-bold">
                  ${formatCompact(stats.biggestSingleTx.usdValue)}
                </div>
                <div className="text-sm text-zinc-400 mt-1">
                  <span className="capitalize">{stats.biggestSingleTx.type}</span>
                  {stats.biggestSingleTx.symbol ? ` · ${stats.biggestSingleTx.symbol}` : ''}
                </div>
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                {stats.biggestSingleTx.date.slice(0, 10)}
              </div>
            </div>
          </Panel>
        )}
      </section>

      <section className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={tweet}
          className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition"
        >
          Share on X / Twitter
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-zinc-900 border border-zinc-800 text-white font-semibold py-3 rounded-xl hover:bg-zinc-800 transition"
        >
          Roast another wallet
        </button>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: 'up' | 'down';
}) {
  const subColor =
    subTone === 'up' ? 'text-emerald-400' : subTone === 'down' ? 'text-red-400' : 'text-zinc-500';
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4 min-w-0">
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-500 font-semibold truncate">
        {label}
      </div>
      <div className="text-lg sm:text-2xl font-bold mt-1 font-mono break-words">{value}</div>
      {sub && <div className={`text-[10px] sm:text-xs mt-1 ${subColor} truncate`}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-zinc-600 italic">{children}</div>;
}

function ChainBadge({ chain }: { chain: Chain }) {
  const label = chain === 'evm' ? 'EVM' : 'SOL';
  return (
    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-wider">
      {label}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-16 text-center text-xs text-zinc-600">
      built by{' '}
      <a
        href="https://x.com/yeechian_"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-zinc-400 underline-offset-2 underline text-orange-400"
      >
        @yeechian_
      </a>{' '}
      · not financial advice 
    </footer>
  );
}

function formatCompact(n: number): string {
  if (!isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}
