import type { Metadata } from 'next';
import Link from 'next/link';

type Search = {
  addr?: string;
  v?: string;
  s?: string;
  d?: string;
  t?: string;
  p?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const ogParams = new URLSearchParams({
    s: sp.s || '',
    d: sp.d || '0',
    t: sp.t || '0',
    p: sp.p || '0',
  });
  const ogUrl = `/api/og?${ogParams.toString()}`;

  const title = sp.v ? `"${sp.v}" — Wallet Roast` : 'Wallet Roast';
  const description = sp.s || 'Get roasted by your own on-chain history.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogUrl, width: 1719, height: 1046 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
      creator: '@yeechian_',
    },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  return (
    <main className="flex-1 w-full">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6">
          <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">
            Wallet Roast
          </span>
        </h1>

        {sp.v && (
          <blockquote className="text-2xl sm:text-3xl font-black mb-6 leading-tight">
            &ldquo;{sp.v}&rdquo;
          </blockquote>
        )}

        {sp.s && (
          <p className="text-lg sm:text-xl text-orange-300 font-semibold mb-3">
            {sp.s}
          </p>
        )}

        {(sp.d || sp.t || sp.p) && (
          <p className="text-sm text-zinc-500 mb-10">
            Wallet age <span className="text-white font-semibold">{sp.d ?? '?'}d</span> ·{' '}
            <span className="text-white font-semibold">{sp.t ?? '?'}</span> txs analyzed ·{' '}
            <span className="text-white font-semibold">${sp.p ?? '?'}</span> portfolio
          </p>
        )}

        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-black font-bold py-3 px-8 rounded-xl transition"
        >
          Roast my wallet →
        </Link>

        <p className="mt-12 text-xs text-zinc-600">
          built by{' '}
          <a
            href="https://x.com/yeechian_"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 underline-offset-2 hover:underline"
          >
            @yeechian_
          </a>
        </p>
      </div>
    </main>
  );
}
