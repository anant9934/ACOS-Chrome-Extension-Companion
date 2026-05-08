import { Project, Node, SyntaxKind, SourceFile } from "ts-morph";

export class SemanticSlicer {
  private project: Project;

  constructor() {
    this.project = new Project();
  }

  extractSymbol(filePath: string, symbolName: string): string | null {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const symbol = sourceFile.getSymbol();
      // Simple lookup for export or member
      const member = sourceFile.getExportedDeclarations().get(symbolName)?.[0] || 
                     sourceFile.getVariableDeclaration(symbolName) ||
                     sourceFile.getFunction(symbolName) ||
                     sourceFile.getClass(symbolName) ||
                     sourceFile.getInterface(symbolName);
      
      if (member) {
        return member.getText();
      }

      // Fallback: look for a top-level node with that name
      const node = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
        .find(id => id.getText() === symbolName)
        ?.getParent();
        
      return node?.getText() || null;
    } catch (error) {
      console.error(`Slicing failed for ${symbolName} in ${filePath}:`, error);
      return null;
    }
  }

  extractLineRange(filePath: string, startLine: number, endLine: number): string | null {
    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const lines = sourceFile.getFullText().split("\n");
      return lines.slice(startLine - 1, endLine).join("\n");
    } catch (error) {
      return null;
    }
  }

  getRelevantImports(filePath: string, symbols: string[]): string[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    return sourceFile.getImportDeclarations()
      .filter(imp => {
        return imp.getNamedImports().some(ni => symbols.includes(ni.getName())) ||
               symbols.includes(imp.getDefaultImport()?.getText() || "");
      })
      .map(imp => imp.getText());
  }
}
