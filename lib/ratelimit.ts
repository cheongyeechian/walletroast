import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(3, '1 d'),
        analytics: true,
        prefix: 'walletroast',
      })
    : null;

export async function checkRateLimit(ip: string) {
  if (!ratelimit) {
    return { success: true, remaining: 999, reset: 0, configured: false };
  }
  const r = await ratelimit.limit(ip);
  return { ...r, configured: true };
}
