let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();

  try {
    return await fn();
  } catch (error: any) {
    // If we get rate limited, wait longer and retry once
    if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      console.log('Rate limited, waiting 5 seconds before retry...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      lastRequestTime = Date.now();
      return await fn();
    }
    throw error;
  }
}

export function resetRateLimit() {
  lastRequestTime = 0;
}
