import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { existsSync } from "node:fs";
import type { DependencyNode } from "../types.ts";

export class DependencyGraph {
  private workspacePath: string;
  private nodes: Map<string, DependencyNode> = new Map();

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
  }

  async build(): Promise<Map<string, DependencyNode>> {
    this.nodes.clear();
    const files = await this.listSourceFiles(this.workspacePath);

    for (const file of files) {
      const relPath = relative(this.workspacePath, file).replace(/\\/g, "/");
      try {
        const content = await readFile(file, "utf-8");
        const node = this.parseFile(relPath, content);
        this.nodes.set(relPath, node);
      } catch {}
    }

    // Populate callers
    for (const [sourcePath, node] of this.nodes.entries()) {
      for (const imp of node.imports) {
        for (const [targetPath, targetNode] of this.nodes.entries()) {
          if (this.matchesImportSource(sourcePath, imp.source, targetPath)) {
            if (!targetNode.callers.includes(sourcePath)) {
              targetNode.callers.push(sourcePath);
            }
          }
        }
      }
    }

    return this.nodes;
  }

  getSummaryForFile(filePath: string): string {
    const norm = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
    const node = this.nodes.get(norm);
    if (!node) return `File ${norm}: (not in indexed source tree)`;

    const lines: string[] = [`Dependency Overview for ${norm}:`];
    if (node.exports.length > 0) {
      lines.push(`  Exports: ${node.exports.join(", ")}`);
    }
    if (node.imports.length > 0) {
      const imps = node.imports.map((i) => `${i.symbol} from "${i.source}"`).slice(0, 5);
      lines.push(`  Imports: ${imps.join("; ")}${node.imports.length > 5 ? ` (+${node.imports.length - 5} more)` : ""}`);
    }
    if (node.callers.length > 0) {
      lines.push(`  Imported by (${node.callers.length} files): ${node.callers.slice(0, 4).join(", ")}`);
    }

    return lines.join("\n");
  }

  private parseFile(relPath: string, content: string): DependencyNode {
    const imports: Array<{ symbol: string; source: string }> = [];
    const exports: string[] = [];

    // Parse imports: import { A, B } from "./foo"; import C from "./bar";
    const importNamedRe = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importNamedRe.exec(content)) !== null) {
      const symbols = match[1]!.split(",").map((s) => s.trim().split(" as ")[0]!.trim()).filter(Boolean);
      const source = match[2]!;
      for (const sym of symbols) imports.push({ symbol: sym, source });
    }

    const importDefaultRe = /import\s+([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importDefaultRe.exec(content)) !== null) {
      if (match[1] !== "type") {
        imports.push({ symbol: match[1]!, source: match[2]! });
      }
    }

    // Parse exports: export function foo, export class Bar, export const baz
    const exportDeclRe = /export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([a-zA-Z0-9_$]+)/g;
    while ((match = exportDeclRe.exec(content)) !== null) {
      exports.push(match[1]!);
    }

    return {
      file: relPath,
      imports,
      exports,
      callers: [],
    };
  }

  private matchesImportSource(fromFile: string, importSrc: string, targetFile: string): boolean {
    if (!importSrc.startsWith(".")) return false;
    const cleanTarget = targetFile.replace(/\.(ts|js|tsx|jsx|mjs|cjs)$/, "");
    const cleanImport = resolve(this.workspacePath, fromFile, "..", importSrc).replace(/\\/g, "/");
    const cleanTargetFull = resolve(this.workspacePath, cleanTarget).replace(/\\/g, "/");
    return cleanImport === cleanTargetFull || cleanImport === cleanTargetFull + "/index";
  }

  private async listSourceFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === ".v2" || e.name === ".v3" || e.name === "dist") continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          results.push(...(await this.listSourceFiles(full)));
        } else if (/\.(ts|js|tsx|jsx|mjs|cjs)$/.test(e.name)) {
          results.push(full);
        }
      }
    } catch {}
    return results;
  }
}
