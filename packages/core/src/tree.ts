import type { TreeNode, YaakDocument } from "./types";

/** Depth-first iteration over a tree, yielding each node with its depth. */
export function* walkTree(
  nodes: readonly TreeNode[],
  depth = 0,
): Generator<{ node: TreeNode; depth: number }> {
  for (const node of nodes) {
    yield { node, depth };

    if (node.type === "folder") {
      yield* walkTree(node.children, depth + 1);
    }
  }
}

/** Request ids in document order. */
export function flattenTree(nodes: readonly TreeNode[]): string[] {
  const ids: string[] = [];

  for (const { node } of walkTree(nodes)) {
    if (node.type === "request") {
      ids.push(node.id);
    }
  }

  return ids;
}

/** Finds a workspace by id or (case-insensitive) name; defaults to the first one. */
export function findWorkspace(document: YaakDocument, preference?: string | null) {
  if (document.workspaces.length === 0) {
    throw new Error("The Yaak export does not contain any workspaces.");
  }

  if (!preference) {
    return document.workspaces[0]!;
  }

  const wanted = preference.toLowerCase();

  const match = document.workspaces.find(
    (ws) => ws.id === preference || ws.name.toLowerCase() === wanted,
  );

  if (!match) {
    const names = document.workspaces.map((ws) => `"${ws.name}"`).join(", ");
    throw new Error(`Workspace "${preference}" not found. Available: ${names}.`);
  }

  return match;
}

/** Finds a folder node (with its children) anywhere in the tree. */
export function findFolderNode(
  nodes: readonly TreeNode[],
  id: string,
): Extract<TreeNode, { type: "folder" }> | null {
  for (const { node } of walkTree(nodes)) {
    if (node.type === "folder" && node.id === id) {
      return node;
    }
  }

  return null;
}
