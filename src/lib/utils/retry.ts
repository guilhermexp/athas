/**
 * Retry utility with exponential backoff
 * For handling transient API failures gracefully
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffFactor?: number;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: Error) => boolean;
  /** Callback for retry attempts */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Retry on network errors or rate limits
    if (error.message?.includes("network")) return true;
    if (error.message?.includes("rate limit")) return true;
    if (error.message?.includes("timeout")) return true;
    if (error.message?.includes("429")) return true; // Too Many Requests
    if (error.message?.includes("500")) return true; // Server Error
    if (error.message?.includes("502")) return true; // Bad Gateway
    if (error.message?.includes("503")) return true; // Service Unavailable
    if (error.message?.includes("504")) return true; // Gateway Timeout
    return false;
  },
  onRetry: () => {},
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffFactor: number,
): number {
  // Exponential backoff
  const exponentialDelay = initialDelay * backoffFactor ** attempt;

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (randomness) to avoid thundering herd
  const jitter = Math.random() * 0.3 * cappedDelay; // ±30% jitter

  return Math.floor(cappedDelay + jitter);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (!opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't delay on last attempt
      if (attempt === opts.maxAttempts - 1) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts.initialDelay, opts.maxDelay, opts.backoffFactor);

      opts.onRetry(attempt + 1, lastError, delay);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {},
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    return retry(() => fn(...args), options);
  };
}

/**
 * Retry with custom shouldRetry logic
 */
export async function retryIf<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: Omit<RetryOptions, "shouldRetry"> = {},
): Promise<T> {
  return retry(fn, { ...options, shouldRetry });
}

/**
 * Retry only on specific error types
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  errorTypes: Array<new (...args: any[]) => Error>,
  options: Omit<RetryOptions, "shouldRetry"> = {},
): Promise<T> {
  return retry(fn, {
    ...options,
    shouldRetry: (error) => errorTypes.some((ErrorType) => error instanceof ErrorType),
  });
}

/**
 * Retry with a circuit breaker pattern
 */
export class CircuitBreaker<T> {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private fn: () => Promise<T>,
    private options: {
      failureThreshold?: number;
      resetTimeout?: number;
      retryOptions?: RetryOptions;
    } = {},
  ) {
    this.options.failureThreshold = options.failureThreshold ?? 5;
    this.options.resetTimeout = options.resetTimeout ?? 60000; // 1 minute
  }

  async execute(): Promise<T> {
    // Check if circuit should be reset
    if (
      this.state === "open" &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime > this.options.resetTimeout!
    ) {
      this.state = "half-open";
      this.failureCount = 0;
    }

    // Circuit is open - fail fast
    if (this.state === "open") {
      throw new Error(
        `Circuit breaker is open. Too many failures. Will reset in ${Math.ceil((this.options.resetTimeout! - (Date.now() - this.lastFailureTime!)) / 1000)}s`,
      );
    }

    try {
      const result = await retry(this.fn, this.options.retryOptions);

      // Success - reset circuit if in half-open state
      if (this.state === "half-open") {
        this.state = "closed";
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failureCount >= this.options.failureThreshold!) {
        this.state = "open";
      }

      throw error;
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = "closed";
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }
}
