import {
  inject,
  provide,
  readonly,
  ref,
  shallowRef,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from "vue";
import type { PnwViewPresentationMode } from "../types/PnwViewPresentation.js";

/**
 * 完整 View 的单行 Header 在 Editor 与浮窗 chrome 之间迁移时使用的运行时通道。
 *
 * 这里只保存 DOM target 与挂载计数；不得持久化，也不得承载 Router、业务 action DTO
 * 或产品状态。业务 actions 仍由原 PnwPageHeader slot 持有并通过 Teleport 单实例迁移。
 */
export interface PnwViewPresentationHeaderChannel {
  readonly target: Readonly<ShallowRef<HTMLElement | undefined>>;
  readonly registeredCount: Readonly<Ref<number>>;
  attachTarget(target: HTMLElement | undefined): void;
  register(): () => void;
}

export interface PnwViewPresentationContext {
  readonly mode: Readonly<Ref<PnwViewPresentationMode>>;
  detach(): void;
  reattach(): void;
  /** Host 可显式注入隔离通道；pnwProvideViewPresentationContext 缺省自动创建。 */
  readonly headerChannel?: PnwViewPresentationHeaderChannel;
  /** 标准 Header 登记后，Host 可以隐藏旧页面使用的 fallback 浮出按钮。 */
  registerHeader?(): () => void;
}

export interface PnwResolvedViewPresentationContext extends PnwViewPresentationContext {
  readonly headerChannel: PnwViewPresentationHeaderChannel;
  registerHeader(): () => void;
}

const pnwViewPresentationContextKey: InjectionKey<PnwResolvedViewPresentationContext> = Symbol(
  "pnw-view-presentation-context",
);

/** 创建单个 View Host 私有的 Header target/registration 通道。 */
export function pnwCreateViewPresentationHeaderChannel(): PnwViewPresentationHeaderChannel {
  const target = shallowRef<HTMLElement>();
  const registeredCount = ref(0);

  return {
    target,
    registeredCount: readonly(registeredCount),
    attachTarget(nextTarget) {
      target.value = nextTarget;
    },
    register() {
      registeredCount.value += 1;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        registeredCount.value = Math.max(0, registeredCount.value - 1);
      };
    },
  };
}

/** 由完整 View 的 Host wrapper 在真实业务 View 挂载前提供。 */
export function pnwProvideViewPresentationContext(
  context: PnwViewPresentationContext,
): PnwResolvedViewPresentationContext {
  const headerChannel = context.headerChannel ?? pnwCreateViewPresentationHeaderChannel();
  const legacyRegisterHeader = context.registerHeader;
  const resolved: PnwResolvedViewPresentationContext = {
    ...context,
    headerChannel,
    registerHeader() {
      const releaseChannel = headerChannel.register();
      const releaseLegacy = legacyRegisterHeader?.();
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        releaseChannel();
        releaseLegacy?.();
      };
    },
  };
  provide(pnwViewPresentationContextKey, resolved);
  return resolved;
}

/** PageHeader 等通用子组件只消费最小命令面，不接触 Portal 或 Router。 */
export function usePnwViewPresentationContext(): PnwResolvedViewPresentationContext | undefined {
  return inject(pnwViewPresentationContextKey, undefined);
}
