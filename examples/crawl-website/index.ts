import { WebsiteCrawler } from "../../src/core/website-crawler";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Initialize the crawler with configuration
    const crawler = new WebsiteCrawler({
      baseUrl: "https://www.sandrina-p.net/",
      maxDepth: 3, // Maximum depth to crawl
      concurrent: 3, // Number of concurrent pages to crawl
      timeout: 30000, // 30 seconds timeout for each page
      maxPages: 100, // Maximum number of pages to crawl
      waitForTimeout: 1000, // Wait 1 second after page load for dynamic content
      excludePatterns: [
        // Exclude common patterns that might not be actual pages
        "\\.(jpg|jpeg|png|gif|svg|css|js|pdf|doc|docx|xls|xlsx|ppt|pptx)$",
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

    console.log("Starting to crawl https://www.sandrina-p.net/...");
    console.log("This might take a while depending on the site size...\n");

    // Start the crawling process
    const pages = await crawler.crawl();

    // Print results
    console.log("\nCrawling completed!");
    console.log(`Found ${pages.length} pages:\n`);

    // Sort pages by path for better readability
    pages.sort((a, b) => a.path.localeCompare(b.path));

    console.table(
      pages.map(({ url, path, lastModified, slug }) => ({
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
    fs.writeFileSync(outputPath, JSON.stringify(pages, null, 2), "utf-8");

    console.log(`\nResults have been saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error during crawling:", error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
