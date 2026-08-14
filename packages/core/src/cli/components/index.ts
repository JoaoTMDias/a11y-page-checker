// cli/commands/RunFromUrl.tsx
import { useEffect } from "react";
import { useApp } from "ink";
import { A11yPageChecker } from "../../core/a11y-page-checker";

type Props = {
  url: string;
  isSitemap: boolean;
};

export function RunFromUrl({ url, isSitemap }: Props) {
  const { exit } = useApp();

  useEffect(() => {
    const run = async () => {
      const checker = new A11yPageChecker({
        sitemap: isSitemap ? url : undefined,
        url: isSitemap ? undefined : url,
      });
      await checker.run();
      exit();
    };

    run();
  }, []);

  return "teste";
}
