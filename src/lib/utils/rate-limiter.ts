// Simple in-memory rate limiter
// In production, use Redis or a database for persistence across server instances

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();

  async check(
    identifier: string,
    action: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ success: boolean; retryAfter?: number }> {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Clean up expired entries
    this.cleanup(windowStart);

    const entry = this.store.get(key);

    if (!entry) {
      // First request for this key
      this.store.set(key, {
        count: 1,
        resetTime: now + (windowSeconds * 1000),
      });
      return { success: true };
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      this.store.set(key, {
        count: 1,
        resetTime: now + (windowSeconds * 1000),
      });
      return { success: true };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { 
        success: false, 
        retryAfter 
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);
    return { success: true };
  }

  private cleanup(cutoff: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < cutoff) {
        this.store.delete(key);
      }
    }
  }

  // Method to reset rate limit for testing or admin purposes
  reset(identifier: string, action: string): void {
    const key = `${identifier}:${action}`;
    this.store.delete(key);
  }

  // Method to get current status
  getStatus(identifier: string, action: string): {
    count: number;
    limit: number;
    resetTime: number;
  } | null {
    const key = `${identifier}:${action}`;
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    return {
      count: entry.count,
      limit: 0, // This would need to be passed in or stored
      resetTime: entry.resetTime,
    };
  }
}

// Export singleton instance
export const rateLimiter = new InMemoryRateLimiter();

// Rate limiting configurations for different actions
export const RATE_LIMITS = {
  registration: {
    limit: 3,
    windowSeconds: 3600, // 1 hour
  },
  login: {
    limit: 5,
    windowSeconds: 900, // 15 minutes
  },
  passwordReset: {
    limit: 3,
    windowSeconds: 3600, // 1 hour
  },
  emailVerification: {
    limit: 5,
    windowSeconds: 3600, // 1 hour
  },
} as const;