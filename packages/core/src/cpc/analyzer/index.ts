export type ContentType = 
  | "typescript" 
  | "javascript" 
  | "json" 
  | "markdown" 
  | "html" 
  | "logs" 
  | "unknown";

export type WorkflowType = 
  | "debugging" 
  | "refactoring" 
  | "architecture_review" 
  | "general";

export interface ContextProblem {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  tokenWasteEstimate: number;
}

export interface AnalysisResult {
  contentType: ContentType;
  workflowType: WorkflowType;
  problems: ContextProblem[];
  totalTokenWasteEstimate: number;
  hallucinationRisk: "low" | "medium" | "high";
}

export class ContextAnalysisEngine {
  
  public analyze(rawText: string): AnalysisResult {
    const contentType = this.detectContentType(rawText);
    const workflowType = this.detectWorkflowType(rawText);
    const problems = this.detectProblems(rawText, contentType);

    const totalTokenWasteEstimate = problems.reduce((sum, p) => sum + p.tokenWasteEstimate, 0);

    let hallucinationRisk: "low" | "medium" | "high" = "low";
    if (problems.some(p => p.severity === "high") || totalTokenWasteEstimate > 500) {
      hallucinationRisk = "high";
    } else if (problems.some(p => p.severity === "medium")) {
      hallucinationRisk = "medium";
    }

    return {
      contentType,
      workflowType,
      problems,
      totalTokenWasteEstimate,
      hallucinationRisk
    };
  }

  private detectContentType(text: string): ContentType {
    if (/^\s*[{[]/m.test(text) && /["']\s*:/m.test(text)) return "json";
    if (/<\/?[a-z][\s\S]*>/i.test(text) && !text.includes("import ") && !text.includes("export ")) return "html";
    if (/(^#+\s|^\s*[-*]\s|\[.+\]\(.+\))/m.test(text)) return "markdown";
    if (/^\s*(at |Trace: |Error: |Exception: )/m.test(text)) return "logs";
    if (/\b(interface|type|implements|namespace)\b/m.test(text) || /(:\s*[A-Z][a-zA-Z0-9_]*(\[\])?\s*[=;,\)])/.test(text)) return "typescript";
    if (/\b(function|const|let|var|class|import|export)\b/m.test(text)) return "javascript";
    return "unknown";
  }

  private detectWorkflowType(text: string): WorkflowType {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("error") || lowerText.includes("exception") || lowerText.includes("stack trace") || lowerText.includes("fails to")) {
      return "debugging";
    }
    if (lowerText.includes("refactor") || lowerText.includes("clean up") || lowerText.includes("optimize")) {
      return "refactoring";
    }
    if (lowerText.includes("architecture") || lowerText.includes("design pattern") || lowerText.includes("how does this work")) {
      return "architecture_review";
    }
    return "general";
  }

  private detectProblems(text: string, contentType: ContentType): ContextProblem[] {
    const problems: ContextProblem[] = [];

    // Redundancy / Excessive HTML wrappers
    if (contentType === "markdown" || contentType === "html") {
      const htmlTags = text.match(/<[^>]+>/g);
      if (htmlTags && htmlTags.length > 20) {
        problems.push({
          type: "excessive_html",
          severity: "high",
          message: "Detected high volume of raw HTML tags which bloat token count significantly.",
          tokenWasteEstimate: htmlTags.length * 4
        });
      }
      
      const images = text.match(/<img[^>]+>|!\[[^\]]*\]\([^)]+\)/g);
      if (images && images.length > 5) {
        problems.push({
          type: "badge_spam",
          severity: "medium",
          message: "Detected multiple image/badge references that provide zero cognitive value to the LLM.",
          tokenWasteEstimate: images.length * 15
        });
      }
    }

    // Repeated Whitespace / Newlines
    const consecutiveNewlines = text.match(/\n{3,}/g);
    if (consecutiveNewlines && consecutiveNewlines.length > 5) {
      problems.push({
        type: "whitespace_bloat",
        severity: "low",
        message: "Excessive empty lines detected.",
        tokenWasteEstimate: consecutiveNewlines.length * 2
      });
    }

    // Oversized Context
    if (text.length > 20000) { // Rough heuristic for ~5k tokens
      problems.push({
        type: "oversized_context",
        severity: "high",
        message: "Context size is massive, significantly increasing hallucination probability.",
        tokenWasteEstimate: Math.floor(text.length / 10)
      });
    }

    return problems;
  }
}
