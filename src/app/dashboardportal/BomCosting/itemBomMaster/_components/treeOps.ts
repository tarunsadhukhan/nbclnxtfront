import { BomTreeItem } from "./types";

export function insertChild(
  tree: BomTreeItem[],
  parentItemId: number,
  newNode: BomTreeItem,
  rootItemId: number
): BomTreeItem[] {
  if (parentItemId === rootItemId) {
    return [...tree, newNode];
  }
  return tree.map((node) => {
    if (node.child_item_id === parentItemId) {
      const children = [...(node.children ?? []), newNode];
      return { ...node, children, has_children: true, is_leaf: false };
    }
    if (node.children?.length) {
      const updated = insertChild(node.children, parentItemId, newNode, rootItemId);
      if (updated !== node.children) return { ...node, children: updated };
    }
    return node;
  });
}

export function updateNode(
  tree: BomTreeItem[],
  bomId: number,
  patch: Partial<BomTreeItem>
): BomTreeItem[] {
  return tree.map((node) => {
    if (node.bom_id === bomId) {
      return { ...node, ...patch };
    }
    if (node.children?.length) {
      const updated = updateNode(node.children, bomId, patch);
      if (updated !== node.children) return { ...node, children: updated };
    }
    return node;
  });
}

export function removeNode(tree: BomTreeItem[], bomId: number): BomTreeItem[] {
  const filtered = tree.filter((n) => n.bom_id !== bomId);
  if (filtered.length !== tree.length) {
    return filtered;
  }
  return tree.map((node) => {
    if (!node.children?.length) return node;
    const updatedChildren = removeNode(node.children, bomId);
    if (updatedChildren !== node.children) {
      const hasChildren = updatedChildren.length > 0;
      return { ...node, children: updatedChildren, has_children: hasChildren, is_leaf: !hasChildren };
    }
    return node;
  });
}

export function findNode(tree: BomTreeItem[], bomId: number): BomTreeItem | null {
  for (const node of tree) {
    if (node.bom_id === bomId) return node;
    if (node.children?.length) {
      const found = findNode(node.children, bomId);
      if (found) return found;
    }
  }
  return null;
}

function findNodeByChildItemId(tree: BomTreeItem[], childItemId: number): BomTreeItem | null {
  for (const node of tree) {
    if (node.child_item_id === childItemId) return node;
    if (node.children?.length) {
      const found = findNodeByChildItemId(node.children, childItemId);
      if (found) return found;
    }
  }
  return null;
}

export function getSiblingChildIds(
  tree: BomTreeItem[],
  parentItemId: number,
  rootItemId: number
): number[] {
  if (parentItemId === rootItemId) {
    return tree.map((n) => n.child_item_id);
  }
  const parent = findNodeByChildItemId(tree, parentItemId);
  return parent?.children?.map((c) => c.child_item_id) ?? [];
}
