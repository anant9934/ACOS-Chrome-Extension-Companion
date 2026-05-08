import { TaskType } from "../types";

export class PromptClassifier {
  classify(prompt: string): TaskType {
    const p = prompt.toLowerCase();

    if (p.includes("error") || p.includes("fix") || p.includes("bug") || p.includes("break")) {
      return "debugging";
    }
    if (p.includes("refactor") || p.includes("clean") || p.includes("rewrite")) {
      return "refactoring";
    }
    if (p.includes("performance") || p.includes("fast") || p.includes("slow") || p.includes("optimize")) {
      return "optimization";
    }
    if (p.includes("test") || p.includes("spec") || p.includes("jest")) {
      return "testing";
    }
    if (p.includes("architecture") || p.includes("design") || p.includes("structure")) {
      return "architecture";
    }
    if (p.includes("ui") || p.includes("style") || p.includes("component") || p.includes("css")) {
      return "ui";
    }
    if (p.includes("db") || p.includes("database") || p.includes("sql") || p.includes("prisma")) {
      return "database";
    }

    return "debugging"; // Default to debugging as it's common
  }
}
