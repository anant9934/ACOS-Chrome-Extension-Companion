import { Project, SourceFile, Symbol } from "ts-morph";

export class DependencyGraph {
  private project: Project;

  constructor(filePaths: string[]) {
    this.project = new Project();
    this.project.addSourceFilesAtPaths(filePaths);
  }

  getFileDependencies(filePath: string): string[] {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) return [];

    const dependencies = new Set<string>();
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpecifier = imp.getModuleSpecifierSourceFile();
      if (moduleSpecifier) {
        dependencies.add(moduleSpecifier.getFilePath());
      }
    });

    return Array.from(dependencies);
  }

  getSymbolDependencies(filePath: string, symbolName: string): string[] {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) return [];

    // Find the symbol
    const symbol = sourceFile.getDescendantAtPos(0)?.getSymbol();
    // In real implementation, we'd use more sophisticated symbol tracing
    
    return []; // Placeholder for symbol tracing logic
  }

  traceRecursive(filePath: string, depth: number = 2): Set<string> {
    const visited = new Set<string>();
    const toVisit = [{ path: filePath, currentDepth: 0 }];

    while (toVisit.length > 0) {
      const { path, currentDepth } = toVisit.shift()!;
      if (visited.has(path) || currentDepth > depth) continue;

      visited.add(path);
      const deps = this.getFileDependencies(path);
      deps.forEach(dep => {
        toVisit.push({ path: dep, currentDepth: currentDepth + 1 });
      });
    }

    return visited;
  }
}
