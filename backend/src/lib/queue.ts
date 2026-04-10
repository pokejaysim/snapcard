import Bull from "bull";

// ---------------------------------------------------------------------------
// Bull queue for async listing publish jobs
//
// If REDIS_URL is set: uses real Bull queue with Redis.
// If not set (and not in mock mode): exports null, and publish.ts
// will call processPublishJob() synchronously instead.
// Mock mode bypasses the queue entirely in the route handler.
// ---------------------------------------------------------------------------

const redisUrl = process.env.REDIS_URL;

export const publishQueue: Bull.Queue<{ listingId: string }> | null =
  redisUrl
    ? new Bull<{ listingId: string }>("publish-listing", redisUrl)
    : null;