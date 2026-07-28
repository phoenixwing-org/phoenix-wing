import {
  computed,
  onActivated,
  onDeactivated,
  onUnmounted,
  shallowReactive,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";

/** 每个 consumer 显式创建实例，避免多个工作台共享模块级注册状态。 */
export interface PnwViewContributionRegistry<TContribution> {
  set(viewId: string, contribution: TContribution): void;
  get(viewId?: string | null): TContribution | undefined;
  delete(viewId: string, owner?: TContribution): boolean;
  clear(): void;
}

export interface PnwViewContributionRegistration {
  activate(): void;
  deactivate(): void;
  sync(): void;
  dispose(): void;
}

export function pnwCreateViewContributionRegistry<TContribution>():
  PnwViewContributionRegistry<TContribution> {
  const pnwContributions = shallowReactive(new Map<string, TContribution>());

  return {
    set(viewId, contribution) {
      if (!viewId.trim()) return;
      pnwContributions.set(viewId, contribution);
    },
    get(viewId) {
      return viewId ? pnwContributions.get(viewId) : undefined;
    },
    delete(viewId, owner) {
      if (owner !== undefined && pnwContributions.get(viewId) !== owner) return false;
      return pnwContributions.delete(viewId);
    },
    clear() {
      pnwContributions.clear();
    },
  };
}

/** 可独立单测的注册生命周期；Vue composable 只负责连接组件生命周期。 */
export function pnwCreateViewContributionRegistration<TContribution>(
  registry: PnwViewContributionRegistry<TContribution>,
  viewId: MaybeRefOrGetter<string | null | undefined>,
  contribution: TContribution,
): PnwViewContributionRegistration {
  let pnwActive = false;
  let pnwRegisteredViewId: string | undefined;

  const pnwRelease = (): void => {
    if (!pnwRegisteredViewId) return;
    registry.delete(pnwRegisteredViewId, contribution);
    pnwRegisteredViewId = undefined;
  };
  const pnwSync = (): void => {
    if (!pnwActive) return;
    const pnwNextViewId = toValue(viewId)?.trim() || undefined;
    if (pnwNextViewId === pnwRegisteredViewId) return;
    pnwRelease();
    if (!pnwNextViewId) return;
    registry.set(pnwNextViewId, contribution);
    pnwRegisteredViewId = pnwNextViewId;
  };

  return {
    activate() {
      pnwActive = true;
      pnwSync();
    },
    deactivate() {
      pnwActive = false;
      pnwRelease();
    },
    sync: pnwSync,
    dispose() {
      pnwActive = false;
      pnwRelease();
    },
  };
}

/**
 * View 在自己的 setup 中登记 contribution，并随 KeepAlive 生命周期释放。
 * Router、页面加载器、业务 payload 与持久化仍由 consumer 管理。
 */
export function usePnwViewContribution<TContribution>(
  registry: PnwViewContributionRegistry<TContribution>,
  viewId: MaybeRefOrGetter<string | null | undefined>,
  contribution: TContribution,
): void {
  const pnwRegistration = pnwCreateViewContributionRegistration(
    registry,
    viewId,
    contribution,
  );
  pnwRegistration.activate();
  const pnwStopWatchingViewId = watch(() => toValue(viewId), pnwRegistration.sync, {
    flush: "sync",
  });
  onActivated(pnwRegistration.activate);
  onDeactivated(pnwRegistration.deactivate);
  onUnmounted(() => {
    pnwStopWatchingViewId();
    pnwRegistration.dispose();
  });
}

export function usePnwRegisteredViewContribution<TContribution>(
  registry: PnwViewContributionRegistry<TContribution>,
  viewId: MaybeRefOrGetter<string | null | undefined>,
  fallback: TContribution,
): ComputedRef<TContribution> {
  return computed(() => registry.get(toValue(viewId)) ?? fallback);
}
