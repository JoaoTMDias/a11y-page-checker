```mermaid
flowchart TD
    Start([Start]) --> Config[Load Configuration]
    Config --> SitemapCrawler[Sitemap Crawler]
    Config --> WebsiteCrawler[Website Crawler]

    %% Sitemap Crawler Flow
    subgraph SitemapCrawler
        SC1[Parse Sitemap URLs] --> SC2{Is JSON?}
        SC2 -->|Yes| SC3[Parse JSON Sitemap]
        SC2 -->|No| SC4[Parse XML Sitemap]
        SC3 --> SC5[Transform Entries]
        SC4 --> SC5
        SC5 --> SC6[Extract URLs]
    end

    %% Website Crawler Flow
    subgraph WebsiteCrawler
        WC1[Start Browser] --> WC2[Create Context]
        WC2 --> WC3[Initialize Pages]
        WC3 --> WC4[Start Crawling]
        WC4 --> WC5[Extract Links]
        WC5 --> WC6[Process URLs]
    end

    %% Common Flow
    SC6 --> URLList[URL List]
    WC6 --> URLList

    %% Accessibility Testing
    URLList --> A11yTester[Accessibility Tester]
    subgraph A11yTester
        AT1[Initialize Axe] --> AT2[Process URLs]
        AT2 --> AT3[Run Tests]
        AT3 --> AT4[Collect Results]
    end

    %% Report Generation
    AT4 --> ReportGen[Report Generator]
    subgraph ReportGen
        RG1[Process Results] --> RG2{Format?}
        RG2 -->|HTML| RG3[Generate HTML Report]
        RG2 -->|JSON| RG4[Generate JSON Report]
        RG2 -->|Table| RG5[Generate Table Report]
        RG3 --> RG6[Save Reports]
        RG4 --> RG6
        RG5 --> RG6
    end

    RG6 --> End([End])

    %% Error Handling
    SC1 -.->|Error| ErrorHandler[Error Handler]
    WC1 -.->|Error| ErrorHandler
    AT1 -.->|Error| ErrorHandler
    RG1 -.->|Error| ErrorHandler
    ErrorHandler --> End
```

## Tool Workflow Explanation

1. **Configuration Loading**

   - Loads user configuration for crawlers, testing, and output
   - Validates configuration settings

2. **URL Discovery**

   - **Sitemap Crawler**
     - Supports both XML and JSON sitemaps
     - Extracts URLs and metadata
     - Handles retries and timeouts
   - **Website Crawler**
     - Uses Playwright for dynamic content
     - Follows links up to specified depth
     - Handles JavaScript-rendered content

3. **Accessibility Testing**

   - Uses Axe-core for testing
   - Processes URLs concurrently
   - Collects violations and results
   - Handles timeouts and errors

4. **Report Generation**

   - Supports multiple output formats:
     - HTML (interactive reports)
     - JSON (machine-readable)
     - Table (console-friendly)
   - Generates summary statistics
   - Includes detailed violation information

5. **Error Handling**
   - Graceful error recovery
   - Detailed error reporting
   - Retry mechanisms for failed requests
   - Timeout handling

## Key Features

- **Concurrent Processing**: Handles multiple URLs simultaneously
- **Format Flexibility**: Supports both XML and JSON sitemaps
- **Dynamic Content**: Can crawl JavaScript-rendered pages
- **Comprehensive Testing**: Uses Axe-core for thorough accessibility checks
- **Multiple Reports**: Generates reports in various formats
- **Error Resilience**: Handles failures gracefully with retries
