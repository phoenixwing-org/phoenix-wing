import type {
  PnwFloatingPanelPosition,
  PnwFloatingPanelSize,
} from "../utils/pnwFloatingPanel.js";
import type {
  PnwPresentationFrameDefinition,
  PnwResolvedPresentationFrameDefinition,
} from "./PnwPresentationFrame.js";

/** Web 完整 View 在 Editor 与非模态浮层之间迁移时的受控状态。 */
export type PnwViewPresentationMode =
  | "embedded"
  | "opening"
  | "floating"
  | "reattaching";

/** renderer 类型、View 实例、owner Tab 与运行时 lease 的稳定身份。 */
export interface PnwViewPresentationIdentity {
  readonly rendererId: string;
  readonly viewInstanceId: string;
  readonly ownerTabId: string;
  readonly instanceKey: string;
}

/**
 * 可由 Host 持久化的纯数据记录。
 *
 * DOM、Vue 组件、Teleport target、监听取消函数与 Tauri handle 不得进入本记录。
 */
export interface PnwViewPresentationRecord {
  readonly identity: PnwViewPresentationIdentity;
  readonly mode: PnwViewPresentationMode;
  readonly dialogPosition: PnwFloatingPanelPosition;
  readonly dialogSize: PnwFloatingPanelSize;
  readonly revision: number;
}

export interface PnwViewPresentationInitialState {
  readonly mode?: "embedded" | "floating";
  readonly dialogPosition?: Partial<PnwFloatingPanelPosition>;
  readonly dialogSize?: Partial<PnwFloatingPanelSize>;
  readonly frame?: PnwPresentationFrameDefinition;
  readonly revision?: number;
}

/** owner Tab 只做投影隐藏，记录与顺序始终保留。 */
export type PnwViewPresentationTabPresentation = "keep" | "hide-when-floating";

/** 普通业务 View 可通过 contribution 声明，Home/无稳定 owner 由 Host context 自动禁用。 */
export interface PnwViewPresentationContribution {
  readonly detachable?: boolean;
  readonly tabPresentation?: PnwViewPresentationTabPresentation;
  readonly frame?: PnwPresentationFrameDefinition;
}

export interface PnwViewPresentationContributionContext {
  readonly hasStableOwner: boolean;
  readonly isHome?: boolean;
  readonly supportsFloating?: boolean;
}

export interface PnwResolvedViewPresentationContribution {
  readonly detachable: boolean;
  readonly tabPresentation: PnwViewPresentationTabPresentation;
  readonly frame: PnwResolvedPresentationFrameDefinition;
}

export type PnwPreferredViewPresentation = "embedded" | "floating";

export interface PnwOpenViewPresentationRequest {
  readonly viewId: string;
  readonly preferredPresentation?: PnwPreferredViewPresentation;
  /** 默认单实例；明确允许 parallel 时必须提供稳定 instanceKey。 */
  readonly allowParallel?: boolean;
  readonly instanceKey?: string;
}

export interface PnwOpenViewPresentationInstance {
  readonly viewId: string;
  readonly viewInstanceId: string;
  readonly instanceKey: string;
  readonly mode: PnwViewPresentationMode | "closing";
}

export type PnwOpenViewPresentationAction =
  | { readonly type: "activate-existing"; readonly viewInstanceId: string }
  | { readonly type: "focus-existing"; readonly viewInstanceId: string }
  | {
      readonly type: "create";
      readonly viewId: string;
      readonly instanceKey?: string;
      readonly presentation: PnwPreferredViewPresentation;
    };

/** Workbench 交给 Editor MRU selector 的最小、无 Router 语义可用性记录。 */
export interface PnwEditorViewAvailability {
  readonly viewInstanceId: string;
  readonly open: boolean;
  readonly presentationMode: PnwViewPresentationMode | "closing";
}

/** Editor 与 floating focus 分属两个域，禁止再用一个 activeViewId 混合表达。 */
export interface PnwViewPresentationManagerState {
  readonly activeEditorViewId?: string;
  readonly activeFloatingViewId?: string;
  /** 最近实际在 Editor 中激活的 View，第一项最新；与标签顺序、浮窗 z-order 无关。 */
  readonly editorActivationHistory: readonly string[];
}

export type PnwViewPresentationManagerCommand =
  | { readonly type: "activate-editor"; readonly viewInstanceId: string }
  | { readonly type: "activate-floating"; readonly viewInstanceId: string }
  | {
      readonly type: "detach";
      readonly viewInstanceId: string;
      readonly views: readonly PnwEditorViewAvailability[];
    }
  | { readonly type: "reattach"; readonly viewInstanceId: string }
  | {
      readonly type: "close";
      readonly viewInstanceId: string;
      readonly views: readonly PnwEditorViewAvailability[];
    };

export type PnwViewPresentationOwnerTabAction =
  | { readonly type: "activate-editor"; readonly viewInstanceId: string }
  | { readonly type: "focus-floating"; readonly viewInstanceId: string };

/** 只有 target-ready / frames-returned 命令携带 revision，陈旧确认不得推进状态。 */
export type PnwViewPresentationCommand =
  | { readonly type: "detach" }
  | { readonly type: "targets-ready"; readonly revision: number }
  | { readonly type: "reattach" }
  | { readonly type: "frames-returned"; readonly revision: number }
  | {
      readonly type: "set-dialog-position";
      readonly position: PnwFloatingPanelPosition;
    }
  | {
      readonly type: "set-dialog-size";
      readonly size: PnwFloatingPanelSize;
    };

/** 只存在于当前 renderer 的运行时 target registry，不可持久化。 */
export interface PnwViewPresentationRuntimeTargets {
  readonly viewInstanceId: string;
  readonly revision: number;
  readonly headerTarget: HTMLElement;
  readonly mainTarget: HTMLElement;
}

/** PnwViewPresentationPortal 暴露给所属 View 的最小命令面。 */
export interface PnwViewPresentationPortalHandle {
  detach(): void;
  focus(): void;
  reattach(): void;
  resetToRecommendedSize(): void;
}

export type PnwViewPresentationLeaseRecovery = "rollback" | "dispose";

export interface PnwViewPresentationLeaseEvent {
  readonly type: "orphaned";
  readonly viewInstanceId: string;
  readonly revision: number;
  /** owner 存活则收回 Editor；owner 已关闭才销毁业务状态。 */
  readonly recovery: PnwViewPresentationLeaseRecovery;
}

export interface PnwViewPresentationLeaseSnapshot {
  readonly viewInstanceId: string;
  readonly revision: number;
  readonly ownerAlive: boolean;
  readonly committed: boolean;
  readonly leaseCount: number;
}

export interface PnwViewPresentationLeaseHandle {
  readonly viewInstanceId: string;
  readonly revision: number;
  /** Header/Main 同 revision 全部 ready 后才建立有效 lease。 */
  commit(targets: PnwViewPresentationRuntimeTargets): boolean;
  /** 幂等释放；陈旧 generation 的 release 不影响新宿主。 */
  release(): void;
}

export interface PnwViewPresentationLeaseRegistry {
  acquire(input: {
    readonly viewInstanceId: string;
    readonly revision: number;
    readonly ownerAlive?: boolean;
  }): PnwViewPresentationLeaseHandle;
  setOwnerAlive(viewInstanceId: string, ownerAlive: boolean): void;
  reconcileOwners(records: readonly PnwViewPresentationRecord[]): void;
  snapshot(): readonly PnwViewPresentationLeaseSnapshot[];
  subscribe(listener: (event: PnwViewPresentationLeaseEvent) => void): () => void;
}
