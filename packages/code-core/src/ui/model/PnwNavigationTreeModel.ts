// SPDX-License-Identifier: Apache-2.0

export const PNW_NAVIGATION_TREE_ICON_KEYS = [
  "catalog",
  "folder",
  "folder-open",
  "file",
  "info",
  "settings",
  "search",
  "warning",
  "error",
] as const;

export type PnwNavigationTreeIconKey = (typeof PNW_NAVIGATION_TREE_ICON_KEYS)[number];

export interface PnwNavigationTreeNode {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly iconKey?: PnwNavigationTreeIconKey;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly children?: readonly PnwNavigationTreeNode[];
}

export interface PnwNavigationTreeModel {
  readonly nodes: readonly PnwNavigationTreeNode[];
  readonly expandedNodeIds?: readonly string[];
  readonly selectedNodeId?: string;
  readonly focusedNodeId?: string;
  readonly ariaLabel?: string;
  readonly emptyMessage?: string;
}

export interface PnwNavigationTreeRow {
  readonly node: PnwNavigationTreeNode;
  readonly parentId?: string;
  readonly level: number;
  readonly positionInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly selected: boolean;
}

function pnwNavigationTreeVisibleSiblings(
  nodes: readonly PnwNavigationTreeNode[],
): readonly PnwNavigationTreeNode[] {
  return nodes.filter((node) => node.hidden !== true);
}

function pnwAssertNavigationTreeNodeIds(
  nodes: readonly PnwNavigationTreeNode[],
  seenIds: Set<string>,
): void {
  for (const node of nodes) {
    if (!node.id.trim()) {
      throw new TypeError("PnwNavigationTreeNode.id 不能为空");
    }
    if (seenIds.has(node.id)) {
      throw new TypeError(`PnwNavigationTreeNode.id 必须唯一：${node.id}`);
    }
    seenIds.add(node.id);
    pnwAssertNavigationTreeNodeIds(node.children ?? [], seenIds);
  }
}

export function pnwProjectNavigationTreeRows(
  model: PnwNavigationTreeModel,
): readonly PnwNavigationTreeRow[] {
  pnwAssertNavigationTreeNodeIds(model.nodes, new Set());
  const expandedIds = new Set(model.expandedNodeIds ?? []);
  const rows: PnwNavigationTreeRow[] = [];

  const visit = (
    nodes: readonly PnwNavigationTreeNode[],
    level: number,
    parentId?: string,
  ): void => {
    const siblings = pnwNavigationTreeVisibleSiblings(nodes);
    siblings.forEach((node, index) => {
      const children = pnwNavigationTreeVisibleSiblings(node.children ?? []);
      const hasChildren = children.length > 0;
      const expanded = hasChildren && expandedIds.has(node.id);
      rows.push({
        node,
        parentId,
        level,
        positionInSet: index + 1,
        setSize: siblings.length,
        hasChildren,
        expanded,
        selected: node.id === model.selectedNodeId,
      });
      if (expanded) {
        visit(children, level + 1, node.id);
      }
    });
  };

  visit(model.nodes, 1);
  return rows;
}

export function pnwFindNavigationTreeRow(
  rows: readonly PnwNavigationTreeRow[],
  nodeId: string | undefined,
): PnwNavigationTreeRow | undefined {
  if (!nodeId) return undefined;
  return rows.find((row) => row.node.id === nodeId);
}

export function pnwNavigationTreeInitialFocusId(
  rows: readonly PnwNavigationTreeRow[],
  model: Pick<PnwNavigationTreeModel, "focusedNodeId" | "selectedNodeId">,
): string | undefined {
  const preferredIds = [model.focusedNodeId, model.selectedNodeId];
  for (const nodeId of preferredIds) {
    const row = pnwFindNavigationTreeRow(rows, nodeId);
    if (row && row.node.disabled !== true) return row.node.id;
  }
  return rows.find((row) => row.node.disabled !== true)?.node.id;
}

export function pnwNavigationTreeMoveFocus(
  rows: readonly PnwNavigationTreeRow[],
  currentNodeId: string | undefined,
  direction: "first" | "last" | "next" | "previous",
): string | undefined {
  const enabledRows = rows.filter((row) => row.node.disabled !== true);
  if (!enabledRows.length) return undefined;
  if (direction === "first") return enabledRows[0]?.node.id;
  if (direction === "last") return enabledRows.at(-1)?.node.id;

  const currentIndex = enabledRows.findIndex((row) => row.node.id === currentNodeId);
  if (currentIndex < 0) {
    return direction === "previous" ? enabledRows.at(-1)?.node.id : enabledRows[0]?.node.id;
  }
  const delta = direction === "next" ? 1 : -1;
  const nextIndex = Math.min(enabledRows.length - 1, Math.max(0, currentIndex + delta));
  return enabledRows[nextIndex]?.node.id;
}

export function pnwNavigationTreeChildFocusId(
  rows: readonly PnwNavigationTreeRow[],
  nodeId: string,
): string | undefined {
  const rowIndex = rows.findIndex((row) => row.node.id === nodeId);
  if (rowIndex < 0) return undefined;
  const row = rows[rowIndex];
  return rows
    .slice(rowIndex + 1)
    .find((candidate) => candidate.parentId === row?.node.id && candidate.node.disabled !== true)
    ?.node.id;
}

export function pnwNavigationTreeParentFocusId(
  rows: readonly PnwNavigationTreeRow[],
  nodeId: string,
): string | undefined {
  const parentId = pnwFindNavigationTreeRow(rows, nodeId)?.parentId;
  return pnwFindNavigationTreeRow(rows, parentId)?.node.id;
}
