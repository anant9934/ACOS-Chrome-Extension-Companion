import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// Workaround for Babel's default export handling in some bundlers
const traverse = typeof _traverse === "function" ? _traverse : (_traverse as any).default;

export interface SymbolNode {
  name: string;
  kind: "function" | "class" | "variable" | "interface" | "import";
  startLine: number;
  endLine: number;
}

export interface SemanticGraphData {
  symbols: Map<string, SymbolNode>;
  dependencies: Map<string, Set<string>>; // Symbol A -> Depends on Symbol B
}

export class DependencyGraph {
  private graph: SemanticGraphData = {
    symbols: new Map(),
    dependencies: new Map()
  };

  constructor(private rawCodeSnippets: string[]) {
    this.buildGraph();
  }

  private buildGraph() {
    this.rawCodeSnippets.forEach(code => {
      try {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx", "decorators-legacy"]
        });

        const currentSymbols = new Set<string>();

        // Phase 1: Symbol Extraction
        traverse(ast, {
          ImportDeclaration: (path) => {
            const source = path.node.source.value;
            path.node.specifiers.forEach(spec => {
              const name = spec.local.name;
              this.graph.symbols.set(name, {
                name,
                kind: "import",
                startLine: path.node.loc?.start.line || 0,
                endLine: path.node.loc?.end.line || 0
              });
              currentSymbols.add(name);
            });
          },
          ClassDeclaration: (path) => {
            if (path.node.id) {
              const name = path.node.id.name;
              this.graph.symbols.set(name, {
                name,
                kind: "class",
                startLine: path.node.loc?.start.line || 0,
                endLine: path.node.loc?.end.line || 0
              });
              currentSymbols.add(name);
            }
          },
          FunctionDeclaration: (path) => {
            if (path.node.id) {
              const name = path.node.id.name;
              this.graph.symbols.set(name, {
                name,
                kind: "function",
                startLine: path.node.loc?.start.line || 0,
                endLine: path.node.loc?.end.line || 0
              });
              currentSymbols.add(name);
            }
          },
          VariableDeclarator: (path) => {
            if (t.isIdentifier(path.node.id)) {
              const name = path.node.id.name;
              this.graph.symbols.set(name, {
                name,
                kind: "variable",
                startLine: path.node.loc?.start.line || 0,
                endLine: path.node.loc?.end.line || 0
              });
              currentSymbols.add(name);
            }
          }
        });

        // Phase 2: Dependency Linking (Simplified Call Graph)
        traverse(ast, {
          CallExpression: (path) => {
            let callerName = "anonymous";
            const parentFunc = path.findParent(p => p.isFunctionDeclaration() || p.isClassMethod() || p.isVariableDeclarator());
            
            if (parentFunc) {
              if (parentFunc.isFunctionDeclaration() && parentFunc.node.id) callerName = parentFunc.node.id.name;
              else if (parentFunc.isClassMethod() && t.isIdentifier(parentFunc.node.key)) callerName = parentFunc.node.key.name;
              else if (parentFunc.isVariableDeclarator() && t.isIdentifier(parentFunc.node.id)) callerName = parentFunc.node.id.name;
            }

            if (t.isIdentifier(path.node.callee)) {
              const calledSymbol = path.node.callee.name;
              if (this.graph.symbols.has(calledSymbol)) {
                if (!this.graph.dependencies.has(callerName)) {
                  this.graph.dependencies.set(callerName, new Set());
                }
                this.graph.dependencies.get(callerName)!.add(calledSymbol);
              }
            }
          }
        });

      } catch (error) {
        console.warn("ASIE: Failed to parse AST snippet, falling back to regex mode.", error);
      }
    });
  }

  getSymbolDependencies(symbolName: string): string[] {
    const deps = this.graph.dependencies.get(symbolName);
    return deps ? Array.from(deps) : [];
  }

  getSymbolDetails(symbolName: string): SymbolNode | undefined {
    return this.graph.symbols.get(symbolName);
  }

  getTopologyMetrics() {
    return {
      totalSymbols: this.graph.symbols.size,
      totalEdges: Array.from(this.graph.dependencies.values()).reduce((acc, set) => acc + set.size, 0)
    };
  }
}
