export interface PnwFloatingWindowStackEntry {
  readonly presentationId: string;
  readonly baseZIndex: number;
  readonly focus: () => void;
  readonly title?: string;
  readonly ownerKind?: "tool" | "view";
  readonly requestReattach?: () => void;
}

export interface PnwFloatingWindowStackItem {
  readonly presentationId: string;
  readonly title: string;
  readonly ownerKind?: "tool" | "view";
  readonly active: boolean;
  readonly canReattach: boolean;
}

export interface PnwFloatingWindowStackSnapshot {
  readonly activePresentationId?: string;
  readonly orderedPresentationIds: readonly string[];
  readonly windows: readonly PnwFloatingWindowStackItem[];
}

export interface PnwFloatingWindowStackController {
  register(entry: PnwFloatingWindowStackEntry): () => void;
  activate(presentationId: string): void;
  focus(presentationId: string): void;
  reattach(presentationId: string): void;
  reattachAll(): void;
  isActive(presentationId: string): boolean;
  resolveZIndex(presentationId: string): number | undefined;
  snapshot(): PnwFloatingWindowStackSnapshot;
  subscribe(listener: () => void): () => void;
}

interface PnwMutableFloatingWindowStackEntry extends PnwFloatingWindowStackEntry {
  order: number;
}

/**
 * 创建 renderer 内的非模态浮窗栈。顺序只由存活窗口数量决定，不持久化、也不会无限增长。
 */
export function pnwCreateFloatingWindowStack(): PnwFloatingWindowStackController {
  const entries = new Map<string, PnwMutableFloatingWindowStackEntry>();
  const listeners = new Set<() => void>();
  let activePresentationId: string | undefined;

  function ordered(): PnwMutableFloatingWindowStackEntry[] {
    return [...entries.values()].sort((left, right) => left.order - right.order);
  }

  function compact(): void {
    ordered().forEach((entry, index) => {
      entry.order = index;
    });
  }

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function activate(presentationId: string): void {
    const entry = entries.get(presentationId);
    if (!entry) return;
    const wasActive = activePresentationId === presentationId;
    const maximumOrder = entries.size === 0
      ? 0
      : Math.max(...[...entries.values()].map((candidate) => candidate.order));
    if (!wasActive || entry.order !== maximumOrder) {
      entry.order = maximumOrder + 1;
      compact();
      activePresentationId = presentationId;
      notify();
    }
  }

  return {
    register(entry) {
      if (!entry.presentationId.trim()) {
        throw new TypeError("presentationId must not be empty");
      }
      const existing = entries.get(entry.presentationId);
      entries.set(entry.presentationId, {
        ...entry,
        order: existing?.order ?? entries.size,
      });
      activate(entry.presentationId);
      notify();
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        const wasActive = activePresentationId === entry.presentationId;
        entries.delete(entry.presentationId);
        compact();
        if (wasActive) {
          const previous = ordered().at(-1);
          activePresentationId = previous?.presentationId;
          previous?.focus();
        }
        notify();
      };
    },
    activate,
    focus(presentationId) {
      const entry = entries.get(presentationId);
      if (!entry) return;
      activate(presentationId);
      entry.focus();
    },
    reattach(presentationId) {
      entries.get(presentationId)?.requestReattach?.();
    },
    reattachAll() {
      for (const entry of [...ordered()].reverse()) entry.requestReattach?.();
    },
    isActive(presentationId) {
      return activePresentationId === presentationId;
    },
    resolveZIndex(presentationId) {
      const target = entries.get(presentationId);
      if (!target) return undefined;
      // 同一 stack 即同一 presentation 平面。历史消费者可能给 Tool/View 传入不同
      // baseZIndex；统一取当前存活窗口的最高 base 作为下限，再按全局 live order 排序，
      // 才能保证点击较低 base 的窗口后仍可真正跨类型置顶。
      const presentationBase = Math.max(
        ...[...entries.values()].map((entry) => entry.baseZIndex),
      );
      return presentationBase + ordered().findIndex(
        (entry) => entry.presentationId === presentationId,
      );
    },
    snapshot() {
      return {
        activePresentationId,
        orderedPresentationIds: ordered().map((entry) => entry.presentationId),
        windows: ordered().map((entry) => ({
          presentationId: entry.presentationId,
          title: entry.title?.trim() || entry.presentationId,
          ownerKind: entry.ownerKind,
          active: entry.presentationId === activePresentationId,
          canReattach: Boolean(entry.requestReattach),
        })),
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const PNW_DOCUMENT_FLOATING_WINDOW_STACKS = new WeakMap<Document, PnwFloatingWindowStackController>();

/** 同一 Document/renderer 的默认栈；Host 也可显式创建并注入隔离的栈。 */
export function pnwGetDocumentFloatingWindowStack(
  ownerDocument: Document,
): PnwFloatingWindowStackController {
  const current = PNW_DOCUMENT_FLOATING_WINDOW_STACKS.get(ownerDocument);
  if (current) return current;
  const created = pnwCreateFloatingWindowStack();
  PNW_DOCUMENT_FLOATING_WINDOW_STACKS.set(ownerDocument, created);
  return created;
}
