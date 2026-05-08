import { SemanticNode, SemanticEdge } from "../types";

// Native implementation of a directed graph to replace graphlib
// This ensures 100% compatibility with Chrome Extension Service Workers
// and removes the 'window is not defined' crash caused by legacy UMD fallbacks.
export class Graph {
  private nodes = new Map<string, any>();
  private edges = new Map<string, Map<string, any>>();

  setNode(id: string, value: any = {}) {
    this.nodes.set(id, value);
    if (!this.edges.has(id)) {
      this.edges.set(id, new Map());
    }
  }

  setEdge(v: string, w: string, value: any = {}) {
    if (!this.edges.has(v)) this.edges.set(v, new Map());
    this.edges.get(v)!.set(w, value);
    if (!this.nodes.has(w)) this.setNode(w);
  }

  node(id: string) {
    return this.nodes.get(id);
  }

  outEdges(v: string) {
    const out = this.edges.get(v);
    if (!out) return [];
    return Array.from(out.keys()).map(w => ({ v, w }));
  }

  edge(e: { v: string, w: string }) {
    return this.edges.get(e.v)?.get(e.w);
  }

  nodeCount() {
    return this.nodes.size;
  }

  edgeCount() {
    let count = 0;
    for (const out of this.edges.values()) {
      count += out.size;
    }
    return count;
  }
}

export class SemanticGraphEngine {
  private graph: Graph;

  constructor() {
    this.graph = new Graph();
  }

  addNode(node: SemanticNode) {
    this.graph.setNode(node.id, node);
  }

  addEdge(edge: SemanticEdge) {
    this.graph.setEdge(edge.from, edge.to, { type: edge.type, weight: edge.weight });
  }

  getRelevanceSubGraph(startNodeId: string, depth: number = 3): Graph {
    const subGraph = new Graph();
    const visited = new Set<string>();
    const queue = [{ id: startNodeId, d: 0 }];

    while (queue.length > 0) {
      const { id, d } = queue.shift()!;
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const nodeData = this.graph.node(id);
      if (nodeData) {
        subGraph.setNode(id, nodeData);
        const edges = this.graph.outEdges(id);
        if (edges) {
          edges.forEach(e => {
            subGraph.setEdge(e.v, e.w, this.graph.edge(e));
            queue.push({ id: e.w, d: d + 1 });
          });
        }
      }
    }

    return subGraph;
  }

  findShortestPath(fromId: string, toId: string): string[] {
    // Implementation using graphlib's algorithms
    return [];
  }

  getTopologyMetrics() {
    return {
      nodeCount: this.graph.nodeCount(),
      edgeCount: this.graph.edgeCount()
    };
  }
}
