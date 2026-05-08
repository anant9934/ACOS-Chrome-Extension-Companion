import { TaskType } from "../../cre/types";
import { ContextSlice } from "../../cpc/types";

export class SemanticOrderer {
  order(slices: ContextSlice[], taskType: TaskType): ContextSlice[] {
    const copy = [...slices];

    switch (taskType) {
      case "debugging":
        // Stack trace and failing functions first
        return copy.sort((a, b) => {
          if (a.reasoning.includes("stack trace")) return -1;
          if (b.reasoning.includes("stack trace")) return 1;
          return b.priority - a.priority;
        });

      case "architecture":
        // Higher level modules and entry points first
        return copy.sort((a, b) => {
          if (a.filePath.includes("index") || a.filePath.includes("main")) return -1;
          return b.priority - a.priority;
        });

      case "ui":
        // Components and styles first
        return copy.sort((a, b) => {
          if (a.filePath.includes("tsx") || a.filePath.includes("css")) return -1;
          return b.priority - a.priority;
        });

      default:
        return copy.sort((a, b) => b.priority - a.priority);
    }
  }
}
