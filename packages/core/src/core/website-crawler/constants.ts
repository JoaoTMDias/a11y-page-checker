export const WEBSITE_CRAWLER_DEFAULTS = {
  concurrent: 2,
  excludePatterns: [],
  includePatterns: [],
  maxDepth: 3,
  maxPages: Number.POSITIVE_INFINITY,
  maxRetries: 3,
  timeout: 30_000,
  waitForTimeout: 5000,
};
