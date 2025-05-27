import { WebsiteCrawler } from "../../src/core/website-crawler";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const baseUrl = process.argv[2];

  if (!baseUrl) {
    console.error("Please provide a base URL as a command line argument");
    console.error("Example: npm run crawl https://www.example.com");
    process.exit(1);
  }

  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    console.error("Please provide a valid URL starting with http:// or https://");
    process.exit(1);
  }

  try {
    // Initialize the crawler with configuration
    const crawler = new WebsiteCrawler({
      baseUrl,
      maxDepth: 3, // Maximum depth to crawl
      concurrent: 3, // Number of concurrent pages to crawl
      timeout: 30000, // 30 seconds timeout for each page
      maxPages: 100, // Maximum number of pages to crawl
      waitForTimeout: 1000, // Wait 1 second after page load for dynamic content
      excludePatterns: [
        // Exclude common patterns that might not be actual pages
        ".*\\.(jpg|jpeg|png|gif|svg|css|js|pdf|doc|docx|xls|xlsx|ppt|pptx)$",
        "mailto:", // Exclude email links
        "tel:", // Exclude phone numbers
        "#", // Exclude anchor links
        "\\?.*$", // Exclude URLs with query parameters
        "\\/\\d+$", // Exclude URLs ending with numbers (often pagination)
        "\\/feed\\/?$", // Exclude RSS feeds
        "\\/wp-json\\/.*$", // Exclude WordPress API endpoints
        "\\/wp-admin\\/.*$", // Exclude WordPress admin pages
        "\\/wp-content\\/.*$", // Exclude WordPress content
        "\\/wp-includes\\/.*$", // Exclude WordPress includes
        "\\/wp-login\\.php$", // Exclude WordPress login
        "\\/wp-cron\\.php$", // Exclude WordPress cron
        "\\/wp-.*\\.php$", // Exclude other WordPress PHP files
      ],
    });

    console.log(`Starting to crawl ${baseUrl}...`);
    console.log("This might take a while depending on the site size...\n");

    // Start the crawling process
    const crawledPages = await crawler.crawl();

    // Print results
    console.log("\nCrawling completed!");
    console.log(`Found ${crawledPages.length} pages:\n`);

    // Sort pages by path for better readability
    const sortedPages = crawledPages.sort((a, b) => a.path.localeCompare(b.path));

    console.table(
      sortedPages.map(({ url, path, lastModified, slug }) => ({
        url,
        path,
        lastModified,
        slug,
      })),
    );

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, "crawl-results.json");
    fs.writeFileSync(outputPath, JSON.stringify({ urls: sortedPages }, null, 2), "utf-8");

    console.log(`\nResults have been saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error during crawling:", error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
