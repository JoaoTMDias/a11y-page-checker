# Website Crawler Examples

This directory contains examples of how to use the Website Crawler.

## Crawl Website Example

The `crawl-website.ts` example demonstrates how to use the Website Crawler to discover all pages within a website.

### Features

- Crawls a website starting from a base URL
- Discovers all pages within the same domain
- Handles both traditional and SPA websites
- Excludes non-page links (images, CSS, JS, etc.)
- Saves results to a JSON file
- Provides detailed console output

### Configuration

The example uses the following configuration:

```typescript
{
  baseUrl: "https://joaodias.me",
  maxDepth: 3,        // Maximum depth to crawl
  concurrent: 3,      // Number of concurrent pages to crawl
  timeout: 30000,     // 30 seconds timeout for each page
  maxPages: 100,      // Maximum number of pages to crawl
  waitForTimeout: 1000, // Wait 1 second after page load
  excludePatterns: [  // Patterns to exclude
    "\\.(jpg|jpeg|png|gif|svg|css|js)$",
    "mailto:",
    "tel:",
    "#",
  ]
}
```

### Running the Example

1. Make sure you have all dependencies installed:

   ```bash
   npm install
   ```

2. Run the example:

   ```bash
   npx ts-node examples/crawl-website.ts
   ```

3. The results will be:
   - Displayed in the console
   - Saved to `examples/output/crawl-results.json`

### Output

The example will output:

- Progress information during crawling
- List of discovered pages with their details
- Path to the saved JSON file

### Customizing

To crawl a different website, modify the `baseUrl` in the configuration:

```typescript
const crawler = new WebsiteCrawler({
  baseUrl: "https://your-website.com",
  // ... other configuration
});
```

You can also adjust other parameters like:

- `maxDepth`: How deep to crawl
- `concurrent`: How many pages to crawl simultaneously
- `timeout`: How long to wait for each page
- `maxPages`: Maximum number of pages to crawl
- `excludePatterns`: Patterns to exclude from crawling
