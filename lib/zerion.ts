// lib/zerion.ts
// Real Zerion REST API client based on https://developers.zerion.io docs.
// Auth: HTTP Basic with API key (key + ":" → base64).
// Handles 503 cold-wallet bootstrap with Retry-After.

const BASE_URL = 'https://api.zerion.io/v1';

function authHeader() {
  const key = process.env.ZERION_API_KEY;
  if (!key) throw new Error('ZERION_API_KEY not set');
  // Basic auth: key + ":", then base64
  const b64 = Buffer.from(`${key}:`).toString('base64');
  return `Basic ${b64}`;
}

async function zerionFetch(path: string, retries = 3): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      accept: 'application/json',
      authorization: authHeader(),
    },
  });

  // 503 = cold wallet bootstrap, retry after the indicated delay
  if (res.status === 503 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
    console.log(`[zerion] 503 bootstrap, retrying in ${retryAfter}s (${retries} left)`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return zerionFetch(path, retries - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zerion API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ---------- 4 ENDPOINTS WE USE ----------

export async function fetchPortfolio(address: string) {
  // Total value, 24h change, chain breakdown
  const data = await zerionFetch(`/wallets/${address}/portfolio?currency=usd`);
  return data.data.attributes;
}

export async function fetchPositions(address: string) {
  // Current holdings sorted by value, spam filtered
  const data = await zerionFetch(
    `/wallets/${address}/positions/?currency=usd&sort=-value&filter[trash]=only_non_trash`
  );
  return data.data; // array of positions
}

export async function fetchTransactions(address: string, limit = 100) {
  // Recent transactions with operation_type, transfers, application_metadata
  const data = await zerionFetch(
    `/wallets/${address}/transactions/?currency=usd&page[size]=${limit}`
  );
  return data.data; // array of transactions
}

export async function fetchPnL(address: string, tokenIds?: string[]) {
  // Realized + unrealized PnL. With tokenIds, get per-token breakdown.
  let path = `/wallets/${address}/pnl?currency=usd`;
  if (tokenIds && tokenIds.length > 0) {
    path += `&filter[fungible_ids]=${tokenIds.join(',')}`;
  }
  const data = await zerionFetch(path);
  return data.data.attributes;
}
