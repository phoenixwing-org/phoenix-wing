import type { PnwNavigationNode } from "phoenix-wing";

export interface PwwNavigationModulePlacement {
  readonly root: PnwNavigationNode;
  readonly module: PnwNavigationNode;
}

export const PWW_NAVIGATION_LAYOUT_SCHEMA_VERSION = 1 as const;

export interface PwwNavigationRootPreference {
  readonly id: string;
  readonly label: string;
  readonly shortLabel?: string;
  readonly order: number;
}

export interface PwwNavigationModulePreference {
  readonly moduleId: string;
  readonly rootId: string;
  readonly order: number;
}

/** 可序列化的宿主布局状态；不包含图标、Vue Component 或业务 View payload。 */
export interface PwwNavigationLayoutPreferenceV1 {
  readonly schemaVersion: typeof PWW_NAVIGATION_LAYOUT_SCHEMA_VERSION;
  readonly baseLayoutVersion: string;
  readonly roots: readonly PwwNavigationRootPreference[];
  readonly modulePlacements: readonly PwwNavigationModulePreference[];
}

function pwwCloneExampleNode(node: PnwNavigationNode): PnwNavigationNode {
  return {
    ...node,
    children: node.children?.map(pwwCloneExampleNode),
  };
}

/** fixture 宿主复制默认布局；不是 Wing 公共偏好协议。 */
export function pwwCloneExampleNavigation(
  nodes: readonly PnwNavigationNode[],
): readonly PnwNavigationNode[] {
  return nodes.map(pwwCloneExampleNode);
}

export interface PwwNavigationRootInput {
  readonly label: string;
  readonly shortLabel?: string;
  readonly order?: number;
}

/** fixture 新建空的大分组；小模块仍通过布局表格移动，不在此创建。 */
export function pwwAddExampleNavigationRoot(
  nodes: readonly PnwNavigationNode[],
  input: PwwNavigationRootInput,
): readonly PnwNavigationNode[] {
  const label = input.label.trim();
  const shortLabel = input.shortLabel?.trim();
  if (!label || nodes.some((root) => root.label === label)) return pwwCloneExampleNavigation(nodes);
  const sequence = nodes.reduce((maximum, root) => {
    const match = /^custom-group-(\d+)$/u.exec(root.id);
    return Math.max(maximum, Number(match?.[1] ?? 0));
  }, 0) + 1;
  const maximumOrder = nodes.reduce((maximum, root) => Math.max(maximum, root.order ?? 0), 0);
  return [
    ...pwwCloneExampleNavigation(nodes),
    {
      id: `custom-group-${sequence}`,
      label,
      ...(shortLabel ? { shortLabel } : {}),
      order: maximumOrder + 10,
      hidden: true,
      children: [],
    },
  ];
}

/** fixture 编辑一级大分组的呈现定义；稳定 ID、子模块与运行时属性保持不变。 */
export function pwwUpdateExampleNavigationRoot(
  nodes: readonly PnwNavigationNode[],
  rootId: string,
  input: PwwNavigationRootInput,
): readonly PnwNavigationNode[] {
  const label = input.label.trim();
  const shortLabel = input.shortLabel?.trim();
  const order = input.order;
  if (!label
    || nodes.some((root) => root.id !== rootId && root.label === label)
    || (order !== undefined && !Number.isFinite(order))) {
    return pwwCloneExampleNavigation(nodes);
  }
  return nodes.map((root) => root.id === rootId
    ? {
      ...pwwCloneExampleNode(root),
      label,
      ...(shortLabel ? { shortLabel } : { shortLabel: undefined }),
      ...(order === undefined ? {} : { order: Math.round(order) }),
    }
    : pwwCloneExampleNode(root));
}

/** 内置分组只恢复名称、简称与顺序，不改变用户调整过的小模块归属。 */
export function pwwRestoreExampleNavigationRootDefinition(
  nodes: readonly PnwNavigationNode[],
  defaultNodes: readonly PnwNavigationNode[],
  rootId: string,
): readonly PnwNavigationNode[] {
  const defaultRoot = defaultNodes.find((root) => root.id === rootId);
  if (!defaultRoot) return pwwCloneExampleNavigation(nodes);
  return nodes.map((root) => root.id === rootId
    ? {
      ...pwwCloneExampleNode(root),
      label: defaultRoot.label,
      ...(defaultRoot.shortLabel
        ? { shortLabel: defaultRoot.shortLabel }
        : { shortLabel: undefined }),
      order: defaultRoot.order,
    }
    : pwwCloneExampleNode(root));
}

/** fixture 只允许删除不在默认树中且已经为空的自定义大分组。 */
export function pwwDeleteExampleNavigationRoot(
  nodes: readonly PnwNavigationNode[],
  defaultNodes: readonly PnwNavigationNode[],
  rootId: string,
): readonly PnwNavigationNode[] {
  const root = nodes.find((candidate) => candidate.id === rootId);
  const builtIn = defaultNodes.some((candidate) => candidate.id === rootId);
  if (!root || builtIn || (root.children ?? []).length > 0) {
    return pwwCloneExampleNavigation(nodes);
  }
  return pwwCloneExampleNavigation(nodes.filter((candidate) => candidate.id !== rootId));
}

/** fixture 只把一级大分组的直接子节点视为可调整模块。 */
export function pwwNavigationModulePlacements(
  nodes: readonly PnwNavigationNode[],
): readonly PwwNavigationModulePlacement[] {
  return nodes.flatMap((root) => (root.children ?? [])
    .filter((moduleNode) => !moduleNode.hidden)
    .map((moduleNode) => ({ root, module: moduleNode })));
}

export function pwwCreateExampleNavigationLayoutPreference(
  nodes: readonly PnwNavigationNode[],
  defaultNodes: readonly PnwNavigationNode[],
  baseLayoutVersion: string,
): PwwNavigationLayoutPreferenceV1 {
  return {
    schemaVersion: PWW_NAVIGATION_LAYOUT_SCHEMA_VERSION,
    baseLayoutVersion,
    roots: nodes.map((root) => ({
      id: root.id,
      label: root.label,
      ...(root.shortLabel ? { shortLabel: root.shortLabel } : {}),
      order: root.order ?? 0,
    })),
    modulePlacements: nodes.flatMap((root) => (root.children ?? [])
      .filter((moduleNode) => !moduleNode.hidden)
      .map((moduleNode, order) => ({ moduleId: moduleNode.id, rootId: root.id, order }))),
  };
}

export function pwwApplyExampleNavigationLayoutPreference(
  defaultNodes: readonly PnwNavigationNode[],
  preference: PwwNavigationLayoutPreferenceV1,
  baseLayoutVersion: string,
): readonly PnwNavigationNode[] {
  if (preference.schemaVersion !== PWW_NAVIGATION_LAYOUT_SCHEMA_VERSION
    || preference.baseLayoutVersion !== baseLayoutVersion) {
    return pwwCloneExampleNavigation(defaultNodes);
  }
  const defaultRootIds = new Set(defaultNodes.map((root) => root.id));
  const rootPreferenceById = new Map(preference.roots.map((root) => [root.id, root]));
  let nodes: readonly PnwNavigationNode[] = [
    ...defaultNodes.map((root) => {
      const rootPreference = rootPreferenceById.get(root.id);
      if (!rootPreference?.label.trim()) return pwwCloneExampleNode(root);
      return {
        ...pwwCloneExampleNode(root),
        label: rootPreference.label.trim(),
        ...(rootPreference.shortLabel?.trim()
          ? { shortLabel: rootPreference.shortLabel.trim() }
          : { shortLabel: undefined }),
        order: rootPreference.order,
      };
    }),
    ...preference.roots
      .filter((root) => !defaultRootIds.has(root.id) && root.label.trim())
      .map((root) => ({
        id: root.id,
        label: root.label.trim(),
        ...(root.shortLabel?.trim() ? { shortLabel: root.shortLabel.trim() } : {}),
        order: root.order,
        hidden: true,
        children: [],
      })),
  ];
  for (const placement of [...preference.modulePlacements].sort(
    (left, right) => left.order - right.order,
  )) {
    nodes = pwwMoveExampleNavigationNode(nodes, placement.moduleId, placement.rootId);
  }
  return nodes;
}

function pwwRemoveExampleNode(
  nodes: readonly PnwNavigationNode[],
  nodeId: string,
): { readonly nodes: readonly PnwNavigationNode[]; readonly removed?: PnwNavigationNode } {
  let removed: PnwNavigationNode | undefined;
  const next: PnwNavigationNode[] = [];
  for (const node of nodes) {
    if (node.id === nodeId) {
      removed = node;
      continue;
    }
    if (!node.children || removed) {
      next.push(node);
      continue;
    }
    const childResult = pwwRemoveExampleNode(node.children, nodeId);
    removed = childResult.removed;
    if (!removed) {
      next.push(node);
    } else if (childResult.nodes.length > 0) {
      next.push({ ...node, children: childResult.nodes });
    }
    // fixture 删除移动后为空的旧分组；真实合并规则留待 W4 消费者确认。
  }
  return { nodes: next, removed };
}

/** fixture 将一个节点移到目标一级大分组下，节点 ID 与属性保持不变。 */
export function pwwMoveExampleNavigationNode(
  nodes: readonly PnwNavigationNode[],
  nodeId: string,
  targetRootId: string,
): readonly PnwNavigationNode[] {
  const cloned = pwwCloneExampleNavigation(nodes);
  if (!cloned.some((root) => root.id === targetRootId)) return cloned;
  let removed: PnwNavigationNode | undefined;
  const roots = cloned.map((root) => {
    if (removed) return root;
    const result = pwwRemoveExampleNode(root.children ?? [], nodeId);
    if (!result.removed) return root;
    removed = result.removed;
    // 一级大分组即使暂时为空也保留；内部空分组由 fixture 清理。
    return { ...root, children: result.nodes };
  });
  if (!removed) return cloned;
  return roots.map((root) => {
    if (root.id === targetRootId) {
      return {
        ...root,
        hidden: false,
        children: [...(root.children ?? []), removed!],
      };
    }
    if ((root.children ?? []).length === 0) return { ...root, hidden: true };
    return root;
  });
}

export function pwwFindExampleRootId(
  nodes: readonly PnwNavigationNode[],
  nodeId: string,
): string | undefined {
  const contains = (node: PnwNavigationNode): boolean => node.id === nodeId
    || Boolean(node.children?.some(contains));
  return nodes.find(contains)?.id;
}
