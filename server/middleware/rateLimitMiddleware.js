const buckets = new Map();

function keyFor(req, scope) {
  return [
    scope,
    req.ip || req.socket?.remoteAddress || 'unknown',
  ].join(':');
}

function createRateLimiter({
  scope,
  windowMs,
  max,
  message,
}) {
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = keyFor(req, scope);
    const current = buckets.get(key);

    if (!current || now >= current.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return next();
    }

    if (current.count >= max) {
      const retryAfterSeconds =
        Math.max(
          1,
          Math.ceil(
            (current.resetAt - now) /
            1000
          )
        );

      res.setHeader(
        'Retry-After',
        String(retryAfterSeconds)
      );

      return res.status(429).json({
        message,
        retryAfterSeconds,
      });
    }

    current.count += 1;
    buckets.set(key, current);

    return next();
  };
}

export const loginRateLimit =
  createRateLimiter({
    scope:
      'login',
    windowMs:
      15 * 60 * 1000,
    max:
      20,
    message:
      'Too many sign-in attempts from this network. Please wait before trying again.',
  });

export const verificationRateLimit =
  createRateLimiter({
    scope:
      'verification',
    windowMs:
      10 * 60 * 1000,
    max:
      10,
    message:
      'Too many verification requests. Please wait before requesting another message.',
  });

export const registrationRateLimit =
  createRateLimiter({
    scope:
      'registration',
    windowMs:
      15 * 60 * 1000,
    max:
      10,
    message:
      'Too many registration attempts. Please wait before trying again.',
  });

export const recoveryRateLimit =
  createRateLimiter({
    scope:
      'password-recovery',
    windowMs:
      15 * 60 * 1000,
    max:
      10,
    message:
      'Too many password recovery requests. Please wait before trying again.',
  });

// Remove expired in-memory buckets periodically. This limiter supplements the
// controller-level OTP cooldown/attempt limits without adding another package.
const cleanupTimer =
  setInterval(
    () => {
      const now =
        Date.now();

      for (const [key, value] of buckets.entries()) {
        if (now >= value.resetAt) {
          buckets.delete(key);
        }
      }
    },
    10 * 60 * 1000
  );

cleanupTimer.unref?.();
