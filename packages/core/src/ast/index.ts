import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

/**
 * Basic AST-based code pruning.
 */
export function pruneCode(code: string): string {
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"]
    });

    traverse(ast, {
      // Example: Strip console.log statements
      CallExpression(path: any) {
        const callee = path.node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "console" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "log"
        ) {
          path.remove();
        }
      }
    });

    const output = generate(ast, {
      minified: true,
      comments: false
    });

    return output.code;
  } catch (error) {
    console.error("AST pruning failed:", error);
    return code; // Return original if parsing fails
  }
}
