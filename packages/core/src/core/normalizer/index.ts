import type { AxeResults, Result } from "axe-core";

import type { Finding, Severity } from "@/types";

function normalizeSeverity(impact: Result["impact"]): Severity {
  switch (impact) {
    case "critical":
    case "serious":
    case "moderate":
    case "minor":
      return impact;
    default:
      return "minor";
  }
}

export function normalizeAxeResult(axeResult: AxeResults): Finding[] {
  return axeResult.violations.map((violation) => ({
    id: violation.id,
    impact: normalizeSeverity(violation.impact),
    tags: violation.tags,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      html: node.html,
      target: node.target.flat(),
      ...(node.failureSummary === undefined ? {} : { failureSummary: node.failureSummary }),
    })),
  }));
}
