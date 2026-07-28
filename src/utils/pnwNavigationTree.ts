import type { PnwNavigationNode } from "../types/PnwWorkbenchWeb.js";
import type { PnwRibbonTabDef } from "../types/PnwRibbonConfig.js";

export interface PnwRibbonNavigationAdapterOptions {
  readonly iconFor?: (pageId: string) => unknown;
  readonly shortLabelFor?: (tab: PnwRibbonTabDef) => string | undefined;
}

export interface PnwNavigationTreeRow {
  readonly node: PnwNavigationNode;
  readonly depth: number;
  readonly parentId?: string;
  readonly hasChildren: boolean;
}

export interface PnwNavigationRibbonGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly PnwNavigationNode[];
}

export interface PnwNavigationRibbonModule {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly PnwNavigationRibbonGroup[];
}

/**
 * 将既有 PnwRibbonTabDef 兼容配置投影成统一导航树。
 * 只转换呈现数据；模块过滤、Router、权限与动作仍由宿主负责。
 */
export function pnwNavigationFromRibbonTabs(
  tabs: readonly PnwRibbonTabDef[],
  options: PnwRibbonNavigationAdapterOptions = {},
): readonly PnwNavigationNode[] {
  return tabs.map((tab) => {
    const shortLabel = options.shortLabelFor?.(tab);
    return {
      id: tab.id,
      label: tab.label,
      ...(shortLabel ? { shortLabel } : {}),
      children: tab.groups.map((group) => ({
        id: group.id,
        label: group.label,
        children: group.items.map((item) => ({
          id: item.pageId,
          label: item.label ?? item.pageId,
          ...(options.iconFor ? { icon: options.iconFor(item.pageId) } : {}),
        })),
      })),
    };
  });
}

/** 过滤隐藏节点并按 order 稳定排序；不克隆可见节点。 */
export function pnwVisibleNavigationNodes(
  nodes: readonly PnwNavigationNode[],
): readonly PnwNavigationNode[] {
  return nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => !node.hidden)
    .sort((left, right) => {
      const orderDifference = (left.node.order ?? 0) - (right.node.order ?? 0);
      return orderDifference || left.index - right.index;
    })
    .map(({ node }) => node);
}

/** 将当前受控展开状态投影成 Tree 可见行。 */
export function pnwFlattenNavigationTree(
  nodes: readonly PnwNavigationNode[],
  expandedNodeIds: readonly string[],
): readonly PnwNavigationTreeRow[] {
  const expanded = new Set(expandedNodeIds);
  const rows: PnwNavigationTreeRow[] = [];

  function pnwAppendRows(
    siblings: readonly PnwNavigationNode[],
    depth: number,
    parentId?: string,
  ): void {
    for (const node of pnwVisibleNavigationNodes(siblings)) {
      const children = pnwVisibleNavigationNodes(node.children ?? []);
      rows.push({ node, depth, parentId, hasChildren: children.length > 0 });
      if (children.length > 0 && expanded.has(node.id)) {
        pnwAppendRows(children, depth + 1, node.id);
      }
    }
  }

  pnwAppendRows(nodes, 1);
  return rows;
}

/** 返回两种呈现均可激活的末级节点 ID。 */
export function pnwNavigationLeafIds(
  nodes: readonly PnwNavigationNode[],
): readonly string[] {
  return pnwNavigationLeaves(nodes).map((node) => node.id);
}

/** 返回可激活末级节点，并保留节点引用、可见性和稳定排序。 */
export function pnwNavigationLeaves(
  nodes: readonly PnwNavigationNode[],
): readonly PnwNavigationNode[] {
  const leaves: PnwNavigationNode[] = [];
  for (const node of pnwVisibleNavigationNodes(nodes)) {
    const children = pnwVisibleNavigationNodes(node.children ?? []);
    if (children.length === 0) leaves.push(node);
    else leaves.push(...pnwNavigationLeaves(children));
  }
  return leaves;
}

/** 判断节点自身或任一可见后代是否包含指定 ID。 */
export function pnwNavigationNodeContains(
  node: PnwNavigationNode,
  nodeId: string,
): boolean {
  if (node.id === nodeId) return true;
  return pnwVisibleNavigationNodes(node.children ?? [])
    .some((child) => pnwNavigationNodeContains(child, nodeId));
}

/**
 * 将导航树投影为 Ribbon 的模块/分组/工具项。
 * 第一层是模块，第二层分支是分组，所有末级节点仍引用原节点对象。
 */
export function pnwProjectNavigationRibbon(
  nodes: readonly PnwNavigationNode[],
): readonly PnwNavigationRibbonModule[] {
  return pnwVisibleNavigationNodes(nodes).map((moduleNode) => {
    const moduleChildren = pnwVisibleNavigationNodes(moduleNode.children ?? []);
    if (moduleChildren.length === 0) {
      return {
        id: moduleNode.id,
        label: moduleNode.label,
        groups: [{
          id: `${moduleNode.id}:items`,
          label: moduleNode.label,
          items: [moduleNode],
        }],
      };
    }

    const groups: PnwNavigationRibbonGroup[] = [];
    const directItems: PnwNavigationNode[] = [];
    for (const child of moduleChildren) {
      const childLeaves = pnwNavigationLeaves(child.children ?? []);
      if (childLeaves.length === 0) directItems.push(child);
      else groups.push({ id: child.id, label: child.label, items: childLeaves });
    }
    if (directItems.length > 0) {
      groups.unshift({
        id: `${moduleNode.id}:items`,
        label: moduleNode.label,
        items: directItems,
      });
    }
    return { id: moduleNode.id, label: moduleNode.label, groups };
  });
}
