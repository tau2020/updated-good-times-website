/**
 * Fixed-window rate limiter backed by the rate_limits table, so it holds
 * across serverless instances. One atomic UPSERT per check: the window is
 * reset when it is older than `windowSeconds`, otherwise the counter grows.
 */
import { query } from '../db/index.mjs';
import { config } from '../config.mjs';

/**
 * @returns {{ allowed: boolean, count: number, limit: number, retryAfter: number }}
 */
export async function checkRateLimit(bucket, { limit = config.limits.requestsPerMinute, windowSeconds = 60 } = {}) {
  const { rows } = await query(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now() ELSE rate_limits.window_start END
     RETURNING count, EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2) - now())) AS remaining`,
    [bucket, windowSeconds],
  );
  const count = Number(rows[0]?.count ?? 1);
  const retryAfter = Math.max(1, Math.ceil(Number(rows[0]?.remaining ?? windowSeconds)));
  return { allowed: count <= limit, count, limit, retryAfter };
}

/** Housekeeping: drop windows older than an hour. Called opportunistically by the enquiry endpoint. */
export async function pruneRateLimits() {
  const { rowCount } = await query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'`);
  return rowCount;
}
