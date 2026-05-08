export type ProjectType = "Next.js" | "React" | "Express" | "NestJS" | "TypeScript" | "Other";

export class ProjectFingerprinter {
  identify(filePaths: string[]): ProjectType {
    const p = filePaths.join(" ");

    if (p.includes("next.config") || p.includes("/app/") || p.includes("/pages/")) {
      return "Next.js";
    }
    if (p.includes("App.tsx") || p.includes("react")) {
      return "React";
    }
    if (p.includes("express")) {
      return "Express";
    }
    if (p.includes("nest-factory") || p.includes("app.module.ts")) {
      return "NestJS";
    }
    if (p.includes(".ts")) {
      return "TypeScript";
    }

    return "Other";
  }
}
