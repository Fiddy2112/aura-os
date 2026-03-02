interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, config: RateLimitConfig = { windowMs: 60000, max: 10 }): { success: boolean; remaining: number } {
  const now = Date.now();
  const userData = memoryStore.get(identifier);

  if (!userData || now > userData.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: config.max - 1 };
  }

  if (userData.count >= config.max) {
    return { success: false, remaining: 0 };
  }

  userData.count += 1;
  return { success: true, remaining: config.max - userData.count };
}
