import { Command } from "commander";
import { render } from "ink";

export class CommandLineInterface {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.init();
  }

  private init() {
    this.program
      .name("a11y-page-checker")
      .description("Run accessibility checks on a website or sitemap")
      .version("1.0.0");

    this.program
      .command("url")
      .argument("<url>", "URL of the website or sitemap")
      .option("--sitemap", "Treat URL as sitemap", false)
      .action((url: string, options: { sitemap: boolean }) => {
        render(<RunFromUrl url={url} isSitemap={options.sitemap} />);
      });

    this.program
      .command("config")
      .argument("<path>", "Path to a11y-config.{yml,json}")
      .action((path: string) => {
        render(<RunFromConfig path={path} />);
      });
  }

  public run(argv: string[]) {
    this.program.parse(argv);
  }
}

export default CommandLineInterface;
